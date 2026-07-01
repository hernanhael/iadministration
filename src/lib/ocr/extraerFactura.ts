import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

// Lectura de facturas y documentos de servicios con IA (claude-haiku-4-5).
// Usado por el OCR interactivo (cámara/documento, con confirmación del
// usuario) y por el cron de facturas por email (src/app/api/cron/facturas-gmail).
//
// Reglas (ver CLAUDE.md): la API key vive solo en código de servidor; al
// modelo se le manda la imagen, no datos personales del usuario; el archivo
// se lee en memoria y no se almacena.

// Imágenes (foto o adjunto) y PDF (adjunto).
export const MIME_VALIDOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
] as const;

export type MimeValido = (typeof MIME_VALIDOS)[number];

export const Factura = z.object({
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
  numero_cliente: z
    .string()
    .nullable()
    .describe(
      'Número de cliente, cuenta, contrato o padrón que identifica el servicio contratado, tal como aparece impreso en la factura. null si no aparece.',
    ),
});

export type Factura = z.infer<typeof Factura>;

/** Extrae los datos de una factura con IA. Devuelve null si no se pudo leer. */
export async function extraerFactura(imagenBase64: string, mime: MimeValido): Promise<Factura | null> {
  // Bloque de imagen o de documento (PDF) según el tipo recibido.
  const adjunto =
    mime === 'application/pdf'
      ? {
          type: 'document' as const,
          source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: imagenBase64 },
        }
      : { type: 'image' as const, source: { type: 'base64' as const, media_type: mime, data: imagenBase64 } };

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
              'Extraé el importe total a pagar, la fecha de primer vencimiento, la empresa emisora de este ' +
              'documento y el número de cliente, cuenta o padrón que identifica el servicio, si aparece.',
          },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(Factura) },
  });

  return respuesta.parsed_output ?? null;
}
