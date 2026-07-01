-- ============================================================================
-- gastos-app — No arrastrar el monto del mes anterior en la recurrencia
-- ----------------------------------------------------------------------------
-- generar_gastos_periodo copiaba el último monto conocido del servicio como
-- "referencia a confirmar" al abrir un mes nuevo. Eso inflaba las tarjetas de
-- resumen y el total de la planilla con gastos que el usuario todavía no
-- cargó (ej. Impuesto Inmobiliario, Expensas extraordinarias): aparecían con
-- un monto aunque no hubiera factura/foto/carga manual de ese período.
-- Ahora arranca sin monto, igual que los servicios acumulables, hasta que el
-- usuario lo confirma (OCR o carga manual).
-- ============================================================================

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
    -- Arranca el mes sin monto: lo carga el usuario (OCR o manual). Ya no se
    -- arrastra el último monto conocido, para no computar gastos no cargados.
    null,
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

-- Corrige los gastos ya generados por la recurrencia y todavía no confirmados
-- por el usuario: no deberían tener un monto heredado del mes anterior.
update gastos set monto = null where monto_confirmado = false and monto is not null;
