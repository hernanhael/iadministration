-- ============================================================================
-- gastos-app — Migración 0002: soporte de ingresos
-- Agrega la columna `tipo` a planillas para distinguir egresos de ingresos.
-- ============================================================================

ALTER TABLE planillas
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'egreso'
  CHECK (tipo IN ('egreso', 'ingreso'));

-- (Sin seed automático: el usuario crea sus planillas desde cero.)
