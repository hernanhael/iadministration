-- ============================================================================
-- gastos-app — Migración 0004: índice único parcial en planillas
-- Reemplaza el constraint único (user_id, nombre) por un índice parcial que
-- solo aplica a planillas activas. Así se puede volver a crear una planilla con
-- el mismo nombre que una eliminada (activo = false) sin conflicto.
-- ============================================================================

-- Eliminar el constraint anterior
ALTER TABLE planillas
  DROP CONSTRAINT IF EXISTS planillas_user_id_nombre_key;

-- Índice único solo para planillas activas
CREATE UNIQUE INDEX IF NOT EXISTS planillas_user_id_nombre_activo_idx
  ON planillas (user_id, nombre)
  WHERE activo = true;
