-- ============================================================================
-- gastos-app — Elimina el trigger/función de seed automático de planillas
-- ============================================================================
-- El trigger `on_auth_user_created_seed` (creado manualmente, fuera de las
-- migraciones versionadas) insertaba planillas hardcodeadas del desarrollador
-- ("Clío Mío", "Ituzaingó 1247") para todo usuario nuevo. Además de no ser la
-- decisión de producto (los usuarios crean sus planillas desde cero — ver
-- comentario en 0001_init.sql), quedó roto desde que la migración 0004
-- reemplazó el unique(user_id, nombre) de `planillas` por un índice único
-- parcial (WHERE activo = true): el ON CONFLICT (user_id, nombre) ya no
-- matchea ningún constraint, y auth.signUp fallaba con
-- "Database error saving new user" (SQLSTATE 42P10) en todo registro nuevo.

drop trigger if exists on_auth_user_created_seed on auth.users;
drop function if exists public.seed_planillas_usuario();
