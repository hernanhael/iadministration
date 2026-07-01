import 'server-only';
import { google } from 'googleapis';
import { MIME_VALIDOS, type MimeValido } from '@/lib/ocr/extraerFactura';

// Cliente de Gmail para el cron de facturas por email (src/app/api/cron/facturas-gmail).
// Usa un refresh token de larga duración (obtenido una vez con
// scripts/obtener-refresh-token-gmail.ts) con scope de solo lectura
// (gmail.readonly) — el cron nunca modifica ni etiqueta correos, solo lee.

function clienteGmail() {
  const auth = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth });
}

export interface AdjuntoGmail {
  mime: MimeValido;
  base64: string; // base64 estándar, ya normalizado (Gmail devuelve base64url)
}

/**
 * Busca mensajes nuevos de un remitente (últimos 2 días, con margen respecto
 * de la periodicidad diaria del cron) y descarta los que ya estén en
 * `idsProcesados`. Devuelve los IDs de más viejo a más nuevo.
 */
export async function buscarMensajesNuevos(params: {
  emailRemitente: string;
  idsProcesados: Set<string>;
}): Promise<string[]> {
  const gmail = clienteGmail();
  const { data } = await gmail.users.messages.list({
    userId: 'me',
    q: `from:${params.emailRemitente} newer_than:2d`,
  });
  const ids = (data.messages ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));
  return ids.reverse().filter((id) => !params.idsProcesados.has(id));
}

/** Primer adjunto con un mime soportado por el OCR, o null si no hay ninguno. */
export async function obtenerPrimerAdjunto(messageId: string): Promise<AdjuntoGmail | null> {
  const gmail = clienteGmail();
  const { data: mensaje } = await gmail.users.messages.get({ userId: 'me', id: messageId });
  const parte = buscarParteAdjunta(mensaje.payload);
  if (!parte?.body?.attachmentId) return null;

  const { data: adjunto } = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId,
    id: parte.body.attachmentId,
  });
  if (!adjunto.data) return null;

  return { mime: parte.mimeType as MimeValido, base64: base64UrlABase64(adjunto.data) };
}

type ParteGmail = {
  mimeType?: string | null;
  filename?: string | null;
  body?: { attachmentId?: string | null } | null;
  parts?: ParteGmail[] | null;
};

/** Recorre las partes del mensaje (recursivo) buscando el primer adjunto con
 *  un mime soportado por el OCR. `filename` no vacío distingue un adjunto real
 *  de una parte de texto/html del cuerpo. */
function buscarParteAdjunta(
  payload: ParteGmail | null | undefined,
): { mimeType: string; body: { attachmentId: string } } | null {
  if (!payload) return null;

  if (
    payload.filename &&
    payload.mimeType &&
    payload.body?.attachmentId &&
    (MIME_VALIDOS as readonly string[]).includes(payload.mimeType)
  ) {
    return { mimeType: payload.mimeType, body: { attachmentId: payload.body.attachmentId } };
  }

  for (const parte of payload.parts ?? []) {
    const encontrada = buscarParteAdjunta(parte);
    if (encontrada) return encontrada;
  }
  return null;
}

/** Gmail devuelve los adjuntos en base64url; la API de Anthropic espera base64 estándar. */
function base64UrlABase64(data: string): string {
  return data.replace(/-/g, '+').replace(/_/g, '/');
}
