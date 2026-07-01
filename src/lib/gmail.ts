import 'server-only';
import { google, gmail_v1 } from 'googleapis';

// Cliente de Gmail (Fase cron de importación de facturas): solo lectura, solo
// servidor. Usa un refresh_token de una única cuenta (app personal, no
// multi-tenant) — ver scripts/gmail-auth.ts para obtenerlo.

const LARGO_MAX_CUERPO = 8000;

export interface CorreoLeido {
  id: string;
  threadId: string;
  remitente: string | null;
  asunto: string | null;
  fecha: string | null;
  cuerpoTexto: string;
}

export function getGmailClient(): gmail_v1.Gmail {
  const auth = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth });
}

/** Ids de mensajes recientes que matchean la búsqueda (sin traer el contenido). */
export async function buscarCorreosRecientes(
  gmail: gmail_v1.Gmail,
  { query = 'in:inbox newer_than:2d', maxResultados = 25 }: { query?: string; maxResultados?: number } = {},
): Promise<{ id: string; threadId: string }[]> {
  const res = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: maxResultados });
  return (res.data.messages ?? [])
    .filter((m): m is { id: string; threadId: string } => Boolean(m.id && m.threadId))
    .map((m) => ({ id: m.id, threadId: m.threadId }));
}

function header(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, nombre: string): string | null {
  return headers?.find((h) => h.name?.toLowerCase() === nombre.toLowerCase())?.value ?? null;
}

function decodificarBase64Url(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf-8');
}

/** Recorre las partes del mensaje y arma un texto plano, prefiriendo text/plain. */
function extraerCuerpo(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return '';

  const partes: gmail_v1.Schema$MessagePart[] = [];
  const acumular = (p: gmail_v1.Schema$MessagePart) => {
    partes.push(p);
    p.parts?.forEach(acumular);
  };
  acumular(payload);

  const plano = partes.find((p) => p.mimeType === 'text/plain' && p.body?.data);
  if (plano?.body?.data) return decodificarBase64Url(plano.body.data);

  const html = partes.find((p) => p.mimeType === 'text/html' && p.body?.data);
  if (html?.body?.data) {
    return decodificarBase64Url(html.body.data)
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return '';
}

/** Trae asunto/remitente/fecha/cuerpo de un mensaje puntual. */
export async function obtenerCorreo(gmail: gmail_v1.Gmail, messageId: string): Promise<CorreoLeido> {
  const res = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
  const headers = res.data.payload?.headers;
  const cuerpoTexto = extraerCuerpo(res.data.payload).slice(0, LARGO_MAX_CUERPO);

  return {
    id: res.data.id ?? messageId,
    threadId: res.data.threadId ?? messageId,
    remitente: header(headers, 'From'),
    asunto: header(headers, 'Subject'),
    fecha: header(headers, 'Date'),
    cuerpoTexto,
  };
}
