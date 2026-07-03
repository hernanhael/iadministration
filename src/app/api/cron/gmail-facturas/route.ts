import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { getGmailClient, buscarCorreosRecientes, obtenerCorreo } from '@/lib/gmail';
import { periodoActual } from '@/lib/formateo';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Cron diario (ver vercel.json) — EXCEPCIÓN deliberada a la regla "el gasto
// nunca se guarda automáticamente" (ver CLAUDE.md, sección IA). Detecta
// facturas nuevas en el Gmail del usuario, matchea contra sus servicios
// activos con Claude y guarda el gasto sin pedir confirmación. Solo escribe
// cuando hay match con confianza razonable y un monto extraído; todo lo
// demás (y todo lo procesado) queda logueado en gmail_procesados para poder
// auditar qué pasó con cada correo.

type Resultado = 'aplicado' | 'sin_match' | 'sin_monto' | 'ya_confirmado' | 'error';

/** Header Date del correo → ISO, o null si no es parseable (no puede tirar abajo el log). */
function fechaISO(fecha: string | null): string | null {
  if (!fecha) return null;
  const d = new Date(fecha);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const Deteccion = z.object({
  servicio_id: z
    .string()
    .nullable()
    .describe(
      'id EXACTO tomado de la lista de servicios provista que mejor coincide con el remitente/asunto/cuerpo de este correo. null si ninguno coincide con confianza razonable. Nunca inventes un id que no esté en la lista.',
    ),
  confianza: z.enum(['alta', 'media', 'baja']).describe('confianza del match anterior'),
  monto: z.number().nullable().describe('Importe total a pagar. null si no se distingue.'),
  vencimiento: z
    .string()
    .nullable()
    .describe('Fecha de primer vencimiento en formato YYYY-MM-DD. null si no aparece.'),
});

export async function GET(req: Request) {
  // 1) Autenticación del cron (Vercel manda Authorization: Bearer $CRON_SECRET).
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  // 2) Variables de entorno necesarias.
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, ANTHROPIC_API_KEY, CRON_USER_ID } =
    process.env;
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN || !ANTHROPIC_API_KEY || !CRON_USER_ID) {
    return Response.json(
      { error: 'Faltan variables de entorno (Gmail, Anthropic o CRON_USER_ID).' },
      { status: 503 },
    );
  }

  const supabase = createAdminClient();
  const periodo = periodoActual();

  // 3) Servicios candidatos: activos, no acumulables (nafta y similares quedan
  // fuera de esta primera versión: su modelo de cargas no mapea a un solo monto).
  const { data: servicios, error: errServicios } = await supabase
    .from('servicios')
    .select('id, nombre, empresa')
    .eq('user_id', CRON_USER_ID)
    .eq('activo', true)
    .eq('acumulable', false);
  if (errServicios) {
    return Response.json({ error: `Error al leer servicios: ${errServicios.message}` }, { status: 500 });
  }
  if (!servicios || servicios.length === 0) {
    return Response.json({ candidatos: 0, aplicados: 0, sin_match: 0, sin_monto: 0, ya_confirmado: 0, errores: 0 });
  }

  // 4) Correos ya resueltos (resultado decisivo): no se reprocesan. Los que
  // quedaron en 'error' sí se reintentan al día siguiente.
  const { data: procesados } = await supabase
    .from('gmail_procesados')
    .select('gmail_message_id')
    .eq('user_id', CRON_USER_ID)
    .in('resultado', ['aplicado', 'sin_match', 'sin_monto', 'ya_confirmado']);
  const yaVistos = new Set((procesados ?? []).map((p) => p.gmail_message_id));

  const gmail = getGmailClient();
  const candidatos = (await buscarCorreosRecientes(gmail)).filter((m) => !yaVistos.has(m.id));

  const anthropic = new Anthropic();
  const contadores: Record<Resultado, number> = {
    aplicado: 0,
    sin_match: 0,
    sin_monto: 0,
    ya_confirmado: 0,
    error: 0,
  };

  const listaServicios = servicios.map((s) => ({ id: s.id, nombre: s.nombre, empresa: s.empresa }));

  for (const { id: messageId, threadId } of candidatos) {
    let resultado: Resultado = 'error';
    let servicioId: string | null = null;
    let gastoId: string | null = null;
    let montoDetectado: number | null = null;
    let vencimientoDetectado: string | null = null;
    let detalle: string | null = null;
    let correoRemitente: string | null = null;
    let correoAsunto: string | null = null;
    let correoFecha: string | null = null;

    try {
      const correo = await obtenerCorreo(gmail, messageId);
      correoRemitente = correo.remitente;
      correoAsunto = correo.asunto;
      correoFecha = correo.fecha;

      const respuesta = await anthropic.messages.parse({
        model: 'claude-haiku-4-5',
        max_tokens: 512,
        system:
          'Sos un asistente que identifica si un correo es una factura o aviso de vencimiento de uno de los ' +
          'servicios fijos del usuario (Argentina), y en ese caso extrae el importe y la fecha de vencimiento. ' +
          `Lista de servicios existentes: ${JSON.stringify(listaServicios)}. ` +
          'Elegí como máximo un servicio de esa lista exacta (por su id) si el remitente, asunto o cuerpo lo ' +
          'mencionan claramente (por nombre o por empresa/proveedor). Si no hay ningún servicio de la lista que ' +
          'coincida con razonable confianza, o el correo no es una factura/aviso de pago, devolvé servicio_id: null. ' +
          'Nunca inventes un id fuera de la lista. Si un dato no aparece con claridad, devolvé null en vez de inventarlo.',
        messages: [
          {
            role: 'user',
            content:
              `De: ${correo.remitente ?? '(desconocido)'}\n` +
              `Asunto: ${correo.asunto ?? '(sin asunto)'}\n` +
              `Fecha: ${correo.fecha ?? '(sin fecha)'}\n\n` +
              `${correo.cuerpoTexto || '(sin cuerpo de texto)'}`,
          },
        ],
        output_config: { format: zodOutputFormat(Deteccion) },
      });

      const datos = respuesta.parsed_output;
      if (!datos || !datos.servicio_id || datos.confianza === 'baja') {
        resultado = 'sin_match';
        detalle = datos ? `confianza=${datos.confianza}` : 'Sin respuesta estructurada del modelo.';
      } else if (datos.monto === null) {
        resultado = 'sin_monto';
        servicioId = datos.servicio_id;
        vencimientoDetectado = datos.vencimiento;
      } else {
        servicioId = datos.servicio_id;
        montoDetectado = datos.monto;
        vencimientoDetectado = datos.vencimiento;

        // Gasto existente del período para ese servicio (lo normal: lo crea
        // generar_gastos_periodo al abrir el Mes como fila "a confirmar").
        const { data: gastoExistente } = await supabase
          .from('gastos')
          .select('id, monto_confirmado, origen_email')
          .eq('servicio_id', servicioId)
          .eq('periodo', periodo)
          .maybeSingle();

        if (gastoExistente && gastoExistente.monto_confirmado && !gastoExistente.origen_email) {
          // Ya confirmado a mano por el usuario: el cron nunca lo pisa.
          resultado = 'ya_confirmado';
          gastoId = gastoExistente.id;
        } else if (gastoExistente) {
          const { error: errUpdate } = await supabase
            .from('gastos')
            .update({
              monto: montoDetectado,
              ...(vencimientoDetectado ? { vencimiento: vencimientoDetectado } : {}),
              estado: 'pendiente',
              monto_confirmado: true,
              origen_email: true,
            })
            .eq('id', gastoExistente.id);
          if (errUpdate) throw new Error(errUpdate.message);
          resultado = 'aplicado';
          gastoId = gastoExistente.id;
        } else {
          const { data: nuevoGasto, error: errInsert } = await supabase
            .from('gastos')
            .insert({
              user_id: CRON_USER_ID,
              servicio_id: servicioId,
              periodo,
              monto: montoDetectado,
              vencimiento: vencimientoDetectado,
              estado: 'pendiente',
              monto_confirmado: true,
              origen_email: true,
            })
            .select('id')
            .single();
          if (errInsert) throw new Error(errInsert.message);
          resultado = 'aplicado';
          gastoId = nuevoGasto.id;
        }
      }
    } catch (e) {
      resultado = 'error';
      detalle = e instanceof Error ? e.message : 'Error desconocido al procesar el correo.';
    }

    contadores[resultado]++;
    await supabase.from('gmail_procesados').insert({
      user_id: CRON_USER_ID,
      gmail_message_id: messageId,
      gmail_thread_id: threadId,
      remitente: correoRemitente,
      asunto: correoAsunto,
      fecha_recibido: fechaISO(correoFecha),
      resultado,
      servicio_id: servicioId,
      gasto_id: gastoId,
      monto_detectado: montoDetectado,
      vencimiento_detectado: vencimientoDetectado,
      detalle,
    });
  }

  return Response.json({ candidatos: candidatos.length, ...contadores });
}
