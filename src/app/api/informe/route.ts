import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { createServerAuthClient } from '@/lib/supabase/auth-server';

// Informe con IA (Fase 5): recibe SOLO agregados numéricos del período y
// devuelve un informe redactado con claude-sonnet-4-6.
//
// Reglas (ver CLAUDE.md): valida la sesión antes de llamar a Anthropic; la API
// key vive solo en el servidor; al modelo se le envían únicamente los agregados
// numéricos, nunca imágenes ni datos personales del usuario.

const Body = z.object({
  desde: z.string(),
  hasta: z.string(),
  alcance: z.string(),
  total: z.number(),
  pagado: z.number(),
  meses: z.array(z.object({ periodo: z.string(), total: z.number(), pagado: z.number() })),
  servicios: z.array(z.object({ nombre: z.string(), total: z.number() })),
  areas: z.array(z.object({ area: z.string(), total: z.number() })),
});

export async function POST(req: Request) {
  // 1) Sesión válida.
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
      { error: 'Los informes con IA no están configurados (falta ANTHROPIC_API_KEY).' },
      { status: 503 },
    );
  }

  // 3) Validar el cuerpo (solo agregados).
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'Datos del informe inválidos.' }, { status: 400 });
  }
  const datos = parsed.data;
  if (datos.meses.length === 0) {
    return Response.json({ error: 'No hay datos en el período elegido.' }, { status: 422 });
  }

  // 4) Redactar el informe.
  try {
    const client = new Anthropic();
    const respuesta = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system:
        'Sos un asesor financiero que escribe informes breves y claros en español rioplatense ' +
        '(Argentina) sobre gastos fijos del hogar. Todos los importes están en pesos argentinos (ARS). ' +
        'Usá ÚNICAMENTE los números que te paso: no inventes datos, montos ni categorías. ' +
        'Estructurá el informe en tres partes con estos títulos exactos en líneas propias: ' +
        '"Resumen", "Evolución" y "Observaciones". Resumen: el total del período y cuánto se pagó. ' +
        'Evolución: cómo cambió el gasto mes a mes (subas/bajas, tendencia). ' +
        'Observaciones: 2 o 3 puntos accionables (servicios más caros, posibles ahorros). ' +
        'Tono cercano y concreto. No uses markdown ni viñetas con asteriscos; texto plano y párrafos cortos.',
      messages: [
        {
          role: 'user',
          content:
            `Período: ${datos.desde} a ${datos.hasta}. Alcance: ${datos.alcance}.\n` +
            `Total del período: ${datos.total}. Pagado: ${datos.pagado}.\n` +
            `Agregados (JSON, importes en ARS):\n${JSON.stringify(
              { meses: datos.meses, servicios: datos.servicios, areas: datos.areas },
              null,
              2,
            )}`,
        },
      ],
    });

    const texto = respuesta.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    if (!texto) {
      return Response.json({ error: 'No se pudo generar el informe.' }, { status: 502 });
    }
    return Response.json({ informe: texto });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al generar el informe.';
    return Response.json({ error: msg }, { status: 502 });
  }
}
