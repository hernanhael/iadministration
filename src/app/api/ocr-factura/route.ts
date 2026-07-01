import { z } from 'zod';
import { createServerAuthClient } from '@/lib/supabase/auth-server';
import { MIME_VALIDOS, extraerFactura } from '@/lib/ocr/extraerFactura';

// OCR de facturas (Fase 4): recibe una imagen, extrae monto y vencimiento con
// claude-haiku-4-5 y los DEVUELVE para que el usuario confirme. Nunca guarda el
// gasto: la confirmación explícita ocurre en el formulario del cliente.
//
// Reglas (ver CLAUDE.md): valida la sesión antes de llamar a Anthropic; la
// API key vive solo en el servidor; al modelo se le manda la imagen, no datos
// personales del usuario.
//
// El archivo se lee en memoria para extraer los datos y NO se almacena.

const Body = z.object({
  imagen: z.string().min(1), // base64 sin el prefijo data:
  mime: z.enum(MIME_VALIDOS),
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
  const { imagen, mime } = parsed.data;

  // 4) Extraer con el modelo de visión.
  try {
    const datos = await extraerFactura(imagen, mime);
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
