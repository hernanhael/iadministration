import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

// Cliente de servidor ligado a las cookies de la request (anon key).
// Se usa en Server Components, layouts protegidos, Server Actions y route
// handlers que necesiten conocer al usuario autenticado.
// Respeta RLS: actúa con el token del usuario, no con privilegios elevados.
export async function createServerAuthClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Llamado desde un Server Component (cookies de solo lectura).
            // El middleware se encarga de refrescar la sesión, así que es seguro ignorarlo.
          }
        },
      },
    },
  );
}
