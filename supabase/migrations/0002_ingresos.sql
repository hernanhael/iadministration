-- ============================================================================
-- gastos-app — Migración 0002: soporte de ingresos
-- Agrega la columna `tipo` a planillas para distinguir egresos de ingresos.
-- ============================================================================

ALTER TABLE planillas
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'egreso'
  CHECK (tipo IN ('egreso', 'ingreso'));

-- Actualizar el seed para incluir una planilla de ingresos por defecto.
CREATE OR REPLACE FUNCTION seed_planillas_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO planillas (user_id, nombre, detalle, color, tipo) VALUES
    (new.id, 'Auto',     'Clío Mío',                   '#D98A4B', 'egreso'),
    (new.id, 'Inmueble', 'Ituzaingó 1247, Yerba Buena', '#6A8D73', 'egreso'),
    (new.id, 'Personal', null,                          '#5B7DB1', 'egreso'),
    (new.id, 'Trabajo',  null,                          '#4A90A4', 'ingreso')
  ON CONFLICT (user_id, nombre) DO NOTHING;
  RETURN new;
END;
$$;
