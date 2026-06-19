import { redirect } from 'next/navigation';
import { createServerAuthClient } from '@/lib/supabase/auth-server';
import { SUPABASE_CONFIGURADO } from '@/lib/preview';

export default async function Home() {
  // Modo vista previa: entrar directo a la app con datos de ejemplo.
  if (!SUPABASE_CONFIGURADO) redirect('/dashboard');

  const supabase = await createServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? '/dashboard' : '/login');
}
