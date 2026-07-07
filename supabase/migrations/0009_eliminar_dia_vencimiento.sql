-- ============================================================================
-- gastos-app — Eliminar servicios.dia_vencimiento
-- ----------------------------------------------------------------------------
-- Desde la migración 0007 (sin_prellenado_vencimiento), generar_gastos_periodo
-- ya no usa dia_vencimiento para precargar el vencimiento del mes: la fila
-- nueva siempre arranca sin vencimiento. La columna quedó sin ningún lector
-- en el código; se elimina junto con el campo del formulario ModalServicio.
-- ============================================================================

alter table servicios drop column if exists dia_vencimiento;
