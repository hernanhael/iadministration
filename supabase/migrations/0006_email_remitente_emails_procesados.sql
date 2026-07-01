-- ============================================================================
-- gastos-app — Precarga automática de facturas por email (cron diario)
-- ----------------------------------------------------------------------------
-- servicios.email_remitente: dirección de correo del proveedor (ej. facturas
-- de Claro, Naturgy, Edet, SAT). El cron busca en Gmail mensajes de esa
-- dirección y precarga monto/vencimiento del servicio correspondiente.
--
-- emails_procesados: lleva registro de qué mensajes de Gmail ya se
-- procesaron, para no reprocesarlos (ni volver a cobrar la llamada a la IA)
-- en cada corrida diaria del cron. Solo se accede vía service role
-- (createAdminClient) — no hay sesión de usuario en un cron, así que la
-- tabla queda con RLS habilitado y sin políticas (inaccesible desde el
-- cliente/anon, igual que el resto del esquema).
-- ============================================================================

alter table servicios add column email_remitente text;

create table emails_procesados (
  id uuid primary key default gen_random_uuid(),
  gmail_message_id text unique not null,
  servicio_id uuid references servicios(id) on delete cascade,
  procesado_en timestamptz not null default now()
);

alter table emails_procesados enable row level security;
