-- ============================================================================
-- gastos-app — Migración inicial (Fase 1: Fundaciones)
-- Tablas + índices + RLS + trigger de seed + RPC recurrencia
-- (Sin Storage: las facturas no se almacenan; la IA lee la foto y la descarta.)
-- Referencia: docs/spec.md secciones 4 y 5
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4. Modelo de datos
-- ----------------------------------------------------------------------------

-- Planillas: las áreas creables por cada usuario (Auto, Inmueble, Personal,
-- "Otro Auto", etc.). Son el nivel superior del Mes. Cada servicio cuelga de una.
create table if not exists planillas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,            -- ej: "Inmueble", "Auto"
  detalle text,                    -- subtítulo opcional, ej: "Ituzaingó 1247" o "Clío Mío"
  color text not null default '#5F5E5A',
  created_at timestamptz not null default now(),
  unique (user_id, nombre)
);

-- Servicios: la plantilla recurrente de cada gasto fijo (luz, nafta, gimnasio…),
-- colgada directamente de una planilla. El color es propio de cada servicio.
create table if not exists servicios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  planilla_id uuid not null references planillas(id) on delete restrict,
  nombre text not null,            -- ej: "Luz"
  empresa text,                    -- proveedor, ej: "EDET"
  nro_cliente text,                -- N° de cliente/cuenta en la empresa, ej: "3712458-001"
  url_pago text,                   -- link a la plataforma de pago de la empresa
  dia_vencimiento int check (dia_vencimiento between 1 and 31),
  color text not null default '#5F5E5A',  -- punto de color en la grilla y gráficos
  activo boolean not null default true,
  -- Servicio que se carga varias veces al mes (ej. nafta): el gasto del mes acumula
  -- cada carga (ver gastos.cargas) y su monto es la suma. Se paga al hacer cada carga.
  acumulable boolean not null default false,
  created_at timestamptz not null default now()
);

-- Gastos: la instancia mensual de un servicio
create table if not exists gastos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  servicio_id uuid not null references servicios(id) on delete cascade,
  periodo text not null,           -- formato 'YYYY-MM'
  monto numeric(14,2),
  vencimiento date,
  fecha_pago date,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagado')),
  monto_confirmado boolean not null default true,  -- false cuando lo generó la recurrencia
  observacion text,
  -- Cargas individuales de un servicio acumulable (ej. nafta): [{monto, fecha}, …].
  -- Para servicios normales queda como arreglo vacío. El `monto` de arriba es la suma.
  cargas jsonb not null default '[]'::jsonb,
  -- Las facturas no se almacenan: la IA (OCR) lee la foto y carga monto/vencimiento,
  -- y la imagen se descarta. No acumulamos imágenes ni documentación.
  created_at timestamptz not null default now(),
  unique (servicio_id, periodo)    -- un solo gasto por servicio por mes
);

create index if not exists idx_gastos_user_periodo on gastos (user_id, periodo);
create index if not exists idx_gastos_servicio on gastos (servicio_id, periodo);

-- ----------------------------------------------------------------------------
-- Row Level Security: cada usuario solo ve y modifica sus filas
-- ----------------------------------------------------------------------------

alter table planillas enable row level security;
alter table servicios enable row level security;
alter table gastos    enable row level security;

drop policy if exists "solo_propias" on planillas;
drop policy if exists "solo_propias" on servicios;
drop policy if exists "solo_propias" on gastos;

create policy "solo_propias" on planillas for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "solo_propias" on servicios for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "solo_propias" on gastos for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- (Sin Storage) — Decisión de producto: las facturas no se almacenan. La IA
-- (OCR) lee la foto en el navegador, el endpoint la procesa en memoria para
-- extraer monto/vencimiento y la imagen se descarta. No hay bucket ni archivos.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- Seed de planillas iniciales al registrarse un usuario
-- (evita arrancar con la app vacía — principal causa de abandono temprano).
-- Los servicios los crea cada usuario dentro de su planilla.
-- ----------------------------------------------------------------------------

create or replace function seed_planillas_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into planillas (user_id, nombre, detalle, color) values
    (new.id, 'Auto',     'Clío Mío',                  '#D98A4B'),
    (new.id, 'Inmueble', 'Ituzaingó 1247, Yerba Buena','#6A8D73'),
    (new.id, 'Personal', null,                         '#5B7DB1')
  on conflict (user_id, nombre) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_seed on auth.users;
create trigger on_auth_user_created_seed
  after insert on auth.users
  for each row execute function seed_planillas_usuario();

-- ----------------------------------------------------------------------------
-- 5. Recurrencia diferida (sin cron): genera los gastos faltantes del período
-- Idempotente gracias a unique (servicio_id, periodo). Se invoca al abrir la app.
-- ----------------------------------------------------------------------------

create or replace function generar_gastos_periodo(p_periodo text)
returns int
language plpgsql
security invoker
as $$
declare
  filas int;
begin
  insert into gastos (user_id, servicio_id, periodo, monto, vencimiento, estado, monto_confirmado)
  select
    s.user_id,
    s.id,
    p_periodo,
    -- Acumulable (nafta): arranca el mes sin monto (se va sumando con las cargas).
    -- Normal: último monto conocido del servicio, como referencia a confirmar.
    case when s.acumulable then null else
      (select g.monto from gastos g
        where g.servicio_id = s.id and g.monto is not null
        order by g.periodo desc limit 1)
    end,
    -- vencimiento estimado: día del servicio dentro del período pedido
    -- (los acumulables no tienen vencimiento).
    case when s.acumulable or s.dia_vencimiento is null then null
      else make_date(
        split_part(p_periodo, '-', 1)::int,
        split_part(p_periodo, '-', 2)::int,
        least(s.dia_vencimiento,
          extract(day from (date_trunc('month',
            to_date(p_periodo || '-01', 'YYYY-MM-DD'))
            + interval '1 month - 1 day'))::int))
      end,
    'pendiente',
    false
  from servicios s
  where s.activo
    and s.user_id = auth.uid()
    and not exists (
      select 1 from gastos g2
      where g2.servicio_id = s.id and g2.periodo = p_periodo)
  on conflict (servicio_id, periodo) do nothing;

  get diagnostics filas = row_count;
  return filas;
end;
$$;
