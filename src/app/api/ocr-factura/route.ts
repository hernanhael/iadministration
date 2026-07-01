import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { createServerAuthClient } from '@/lib/supabase/auth-server';

// OCR de facturas (Fase 4): recibe una imagen, extrae monto y vencimiento con
// claude-haiku-4-5 y los DEVUELVE para que el usuario confirme. Nunca guarda el
// gasto: la confirmación explícita ocurre en el formulario del cliente.
//
// Reglas (ver CLAUDE.md): valida la sesión antes de llamar a Anthropic; la
// API key vive solo en el servidor; al modelo se le manda la imagen, no datos
// personales del usuario.

// Imágenes (foto o adjunto) y PDF (adjunto). La imagen/PDF se lee en memoria
// para extraer los datos y NO se almacena.
const MIME_VALIDOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
] as const;

const Factura = z.object({
  monto: z
    .number()
    .nullable()
    .describe('Importe TOTAL a pagar, solo el número (sin símbolos ni separadores de miles). null si no se distingue.'),
  vencimiento: z
    .string()
    .nullable()
    .describe('Fecha de primer vencimiento en formato YYYY-MM-DD. null si no aparece.'),
  empresa: z
    .string()
    .nullable()
    .describe('Nombre de la empresa o proveedor que emite la factura. null si no se distingue.'),
});

const Body = z.object({
  imagen: z.string().min(1), // base64 sin el prefijo data:
  mime: z.enum(MIME_VALIDOS),
  // Indicación libre del usuario para ayudar a individualizar el gasto en
  // documentos con varias facturas/páginas (ej. expensas de todo un edificio).
  instrucciones: z.string().trim().max(500).optional(),
});

export async function POST(req: Request) {
  // 1) Sesión válida (RLS con el token del usuario).
  const supabase = await createServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'No hay sesión activa.' }, { status: 401 });
  }

  // 2) API key solo en servidor.
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'El OCR no está configurado (falta ANTHROPIC_API_KEY).' },
      { status: 503 },
    );
  }

  // 3) Validar el cuerpo.
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'Imagen inválida o formato no soportado.' }, { status: 400 });
  }
  const { imagen, mime, instrucciones } = parsed.data;

  // 4) Extraer con el modelo de visión.
  try {
    // Bloque de imagen o de documento (PDF) según el tipo recibido.
    const adjunto =
      mime === 'application/pdf'
        ? {
            type: 'document' as const,
            source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: imagen },
          }
        : { type: 'image' as const, source: { type: 'base64' as const, media_type: mime, data: imagen } };

    const client = new Anthropic();
    const respuesta = await client.messages.parse({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      system:
        'Sos un asistente que lee facturas y documentos de servicios en español (Argentina) y extrae datos clave. ' +
        'Respondé solo con los datos pedidos. Si un dato no aparece con claridad, devolvé null en vez de inventarlo.',
      messages: [
        {
          role: 'user',
          content: [
            adjunto,
            {
              type: 'text',
              text:
                'Extraé el importe total a pagar, la fecha de primer vencimiento y la empresa emisora de este documento.' +
                (instrucciones
                  ? `\n\nIndicación del usuario para individualizar el gasto correcto (por ejemplo, si el documento tiene varias facturas o páginas): ${instrucciones}`
                  : ''),
            },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(Factura) },
    });

    const datos = respuesta.parsed_output;
    if (!datos) {
      return Response.json(
        { error: 'No se pudieron leer los datos de la factura. Cargalos a mano.' },
        { status: 422 },
      );
    }
    return Response.json(datos);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al procesar la factura.';
    return Response.json({ error: msg }, { status: 502 });
  }
}
