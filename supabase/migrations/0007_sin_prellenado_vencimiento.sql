-- ============================================================================
-- gastos-app — No pre-cargar el vencimiento en la recurrencia
-- ----------------------------------------------------------------------------
-- generar_gastos_periodo estimaba el vencimiento del mes nuevo a partir de
-- servicios.dia_vencimiento. Igual que el monto (0005), esto precargaba un
-- dato que el usuario todavía no confirmó: la fila "reiniciada" debe quedar
-- sin vencimiento hasta que se cargue el documento/OCR o se edite a mano.
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
    -- Arranca el mes sin monto: lo carga el usuario (OCR o manual).
    null,
    -- Arranca el mes sin vencimiento: lo carga el usuario (OCR o manual).
    null,
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

-- Corrige los gastos ya generados por la recurrencia y todavía no confirmados:
-- no deberían tener un vencimiento estimado que el usuario no cargó.
update gastos set vencimiento = null where monto_confirmado = false and vencimiento is not null;
