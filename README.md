# iadministration-app

App web personal para administrar gastos fijos (vivienda, auto, personales) e ingresos mensuales. En producción en Vercel.

- **Stack:** Next.js 16 (App Router, TypeScript) · React 19 · Supabase (Auth + PostgreSQL) · Tailwind v4 (tema oscuro) · Recharts · API de Anthropic.
- **Pantallas:** Mes (`/dashboard`), Histórico (`/historico`), Gráficos e Informes (`/graficos`).
- **Modelo:** Planillas → Servicios → Gastos, con recurrencia mensual idempotente (`generar_gastos_periodo`), borrado lógico y estado "vencido" derivado.
- **IA:** OCR de facturas por foto/documento (`claude-haiku-4-5`, con confirmación manual), informes bajo demanda (`claude-sonnet-4-6`) y cron diario que importa facturas desde Gmail (excepción documentada: guarda sin confirmación, con auditoría en `gmail_procesados`).

## Documentación

- `CLAUDE.md` — **fuente de verdad operativa**: decisiones de producto, estado actual y reglas que aplican siempre.
- `docs/spec.md` — diseño original del proyecto (parcialmente superado; ver nota en su encabezado).
- `supabase/migrations/` — esquema completo (aplicar en orden en el SQL Editor de Supabase).

## Desarrollo

```bash
npm install
cp .env.example .env.local   # completar credenciales (sin ellas la app corre en modo vista previa con datos demo)
npm run dev                  # http://localhost:3000
npm run build                # build de producción
npm run lint                 # linting
```

Tras cambios de esquema: `supabase gen types typescript --linked > src/types/database.ts`.

## Scripts puntuales (ya ejecutados, se conservan como referencia)

- `scripts/migrate-sheets.ts` y `scripts/migrate-personal.ts` — migración del historial 2024–2026 desde Google Sheets.
- `scripts/gmail-auth.ts` — obtiene el `GMAIL_REFRESH_TOKEN` para el cron de importación por Gmail.
