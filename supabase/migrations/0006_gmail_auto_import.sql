-- ============================================================================
-- gastos-app — Migración 0006: importación automática de facturas por Gmail
-- Excepción deliberada a la regla de confirmación manual (ver CLAUDE.md, IA):
-- el cron de Gmail SÍ guarda el gasto sin confirmación del usuario. Esta
-- migración agrega la marca visual (origen_email) y la tabla de dedup/auditoría
-- que sirven de contrapeso a esa excepción.
-- ============================================================================

-- Marca las filas de gastos cargadas por el cron de Gmail (no por confirmación
-- manual ni por OCR de foto/documento, que siguen requiriendo confirmación).
alter table gastos add column if not exists origen_email boolean not null default false;

-- Dedup + auditoría de correos procesados por el cron: evita reprocesar el
-- mismo mensaje y deja rastro de por qué un correo no se aplicó.
create table if not exists gmail_procesados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gmail_message_id text not null,
  gmail_thread_id text,
  remitente text,
  asunto text,
  fecha_recibido timestamptz,
  resultado text not null check (resultado in ('aplicado', 'sin_match', 'sin_monto', 'ya_confirmado', 'error')),
  servicio_id uuid references servicios(id) on delete set null,
  gasto_id uuid references gastos(id) on delete set null,
  monto_detectado numeric(14,2),
  vencimiento_detectado date,
  detalle text,
  created_at timestamptz not null default now()
);

create index if not exists idx_gmail_procesados_user_msg
  on gmail_procesados (user_id, gmail_message_id);

alter table gmail_procesados enable row level security;

drop policy if exists "solo_propias" on gmail_procesados;
create policy "solo_propias" on gmail_procesados for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
