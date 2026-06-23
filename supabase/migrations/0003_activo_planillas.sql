-- ============================================================================
-- gastos-app — Migración 0003: campo activo en planillas
-- Permite borrado lógico de planillas (igual que servicios.activo).
-- Al desactivar una planilla: también se desactivan sus servicios y se borran
-- los gastos no confirmados del mes actual. El historial se conserva.
-- ============================================================================

ALTER TABLE planillas
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;
