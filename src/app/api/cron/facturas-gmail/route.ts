import { createAdminClient } from '@/lib/supabase/server';
import { buscarMensajesNuevos, obtenerPrimerAdjunto } from '@/lib/gmail';
import { extraerFactura } from '@/lib/ocr/extraerFactura';
import { periodoActual } from '@/lib/formateo';

// Cron diario (ver vercel.json): revisa Gmail buscando facturas de los
// proveedores configurados (servicios.email_remitente) y precarga monto y
// vencimiento en el gasto del mes correspondiente.
//
// Excepción deliberada a la regla general de OCR (CLAUDE.md): a diferencia de
// la cámara/documento —que siempre quedan a confirmar—, estas cargas quedan
// con monto_confirmado = true de entrada (decisión explícita del usuario para
// este flujo, priorizando cero fricción sobre el checkpoint manual). El único
// resguardo que queda: nunca se pisa un gasto que ya esté confirmado
// (monto_confirmado = true), sea porque el usuario lo cargó a mano o porque un
// email anterior ya lo confirmó ese mismo período.

export const maxDuration = 60;

interface ServicioCron {
  id: string;
  user_id: string;
  nombre: string;
  email_remitente: string;
  nro_cliente: string | null;
}

function normalizarNumero(s: string): string {
  return s.replace(/[^a-z0-9]/gi, '').toUpperCase();
}

/**
 * Un remitente puede facturar más de un servicio (ej. SAT SA: "Agua" de dos
 * inmuebles distintos). Con un solo candidato no hay ambigüedad. Con varios,
 * se matchea por el número de cliente/cuenta/padrón que el OCR extrajo del
 * propio documento contra el `nro_cliente` de cada servicio — no por texto
 * libre de Gmail, que no puede distinguirlos de forma confiable.
 */
function determinarServicio(candidatos: ServicioCron[], numeroCliente: string | null): ServicioCron | null {
  if (candidatos.length === 1) return candidatos[0];
  if (!numeroCliente) return null;
  const buscado = normalizarNumero(numeroCliente);
  const coincidencias = candidatos.filter(
    (c) => c.nro_cliente && normalizarNumero(c.nro_cliente) === buscado,
  );
  return coincidencias.length === 1 ? coincidencias[0] : null;
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function registrarProcesado(admin: AdminClient, messageId: string, servicioId: string | null) {
  await admin.from('emails_procesados').insert({ gmail_message_id: messageId, servicio_id: servicioId });
}

async function procesarMensaje(params: {
  admin: AdminClient;
  messageId: string;
  candidatos: ServicioCron[];
  periodo: string;
}): Promise<Record<string, unknown>> {
  const { admin, messageId, candidatos, periodo } = params;

  const adjunto = await obtenerPrimerAdjunto(messageId);
  if (!adjunto) {
    await registrarProcesado(admin, messageId, null);
    return { accion: 'omitido', motivo: 'sin adjunto válido' };
  }

  const datos = await extraerFactura(adjunto.base64, adjunto.mime);
  if (!datos) {
    await registrarProcesado(admin, messageId, null);
    return { accion: 'omitido', motivo: 'OCR no pudo leer la factura' };
  }

  const servicio = determinarServicio(candidatos, datos.numero_cliente);
  if (!servicio) {
    await registrarProcesado(admin, messageId, null);
    return {
      accion: 'omitido',
      motivo:
        candidatos.length > 1
          ? 'no se pudo determinar el servicio (revisar nro_cliente vs. numero_cliente extraído)'
          : 'servicio no encontrado',
    };
  }

  const { data: existente } = await admin
    .from('gastos')
    .select('id, monto_confirmado')
    .eq('servicio_id', servicio.id)
    .eq('periodo', periodo)
    .maybeSingle();

  await registrarProcesado(admin, messageId, servicio.id);

  if (existente?.monto_confirmado) {
    return { servicio: servicio.nombre, accion: 'omitido', motivo: 'gasto ya confirmado, no se pisa' };
  }

  if (existente) {
    await admin
      .from('gastos')
      .update({ monto: datos.monto, vencimiento: datos.vencimiento, monto_confirmado: true })
      .eq('id', existente.id);
    return { servicio: servicio.nombre, accion: 'actualizado', monto: datos.monto };
  }

  await admin.from('gastos').insert({
    user_id: servicio.user_id,
    servicio_id: servicio.id,
    periodo,
    monto: datos.monto,
    vencimiento: datos.vencimiento,
    estado: 'pendiente',
    monto_confirmado: true,
    cargas: [],
  });
  return { servicio: servicio.nombre, accion: 'creado', monto: datos.monto };
}

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'Falta ANTHROPIC_API_KEY.' }, { status: 503 });
  }
  if (!process.env.GMAIL_REFRESH_TOKEN) {
    return Response.json({ error: 'Falta GMAIL_REFRESH_TOKEN.' }, { status: 503 });
  }

  const admin = createAdminClient();
  const periodo = periodoActual();

  const { data: filas, error: errServicios } = await admin
    .from('servicios')
    .select('id, user_id, nombre, email_remitente, nro_cliente')
    .eq('activo', true)
    .not('email_remitente', 'is', null);
  if (errServicios) {
    return Response.json({ error: errServicios.message }, { status: 500 });
  }

  const porRemitente = new Map<string, ServicioCron[]>();
  for (const s of filas ?? []) {
    if (!s.email_remitente) continue;
    const email = s.email_remitente.trim().toLowerCase();
    const lista = porRemitente.get(email) ?? [];
    lista.push({ id: s.id, user_id: s.user_id, nombre: s.nombre, email_remitente: email, nro_cliente: s.nro_cliente });
    porRemitente.set(email, lista);
  }

  const { data: procesados } = await admin.from('emails_procesados').select('gmail_message_id');
  const idsProcesados = new Set((procesados ?? []).map((p) => p.gmail_message_id));

  const resultados: Array<Record<string, unknown>> = [];

  for (const [emailRemitente, candidatos] of porRemitente) {
    try {
      const mensajes = await buscarMensajesNuevos({ emailRemitente, idsProcesados });
      for (const messageId of mensajes) {
        try {
          const resultado = await procesarMensaje({ admin, messageId, candidatos, periodo });
          resultados.push({ remitente: emailRemitente, mensaje: messageId, ...resultado });
        } catch (e) {
          resultados.push({
            remitente: emailRemitente,
            mensaje: messageId,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    } catch (e) {
      resultados.push({ remitente: emailRemitente, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return Response.json({ ok: true, periodo, resultados });
}
