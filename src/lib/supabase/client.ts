import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

// Cliente de navegador (anon key). Lo usan componentes y hooks del cliente.
// La privacidad la garantiza Row Level Security, no este código.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
