import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Cliente con SERVICE ROLE KEY: saltea RLS y tiene privilegios totales.
// SOLO debe usarse desde API routes del servidor (p. ej. los endpoints de IA
// que descargan imágenes del bucket privado validando antes la pertenencia).
// Ningún componente ni hook del cliente debe importar este archivo.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
