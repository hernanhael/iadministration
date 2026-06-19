import { redirect } from 'next/navigation';
import { createServerAuthClient } from '@/lib/supabase/auth-server';
import { SUPABASE_CONFIGURADO } from '@/lib/preview';
import { Navbar } from '@/components/Navbar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Modo vista previa (sin Supabase): renderizar la app con un usuario ficticio.
  if (!SUPABASE_CONFIGURADO) {
    return (
      <div className="min-h-screen">
        <div className="bg-warning/10 px-4 py-2 text-center text-sm font-semibold text-warning">
          Modo vista previa — datos de ejemplo. Conectá Supabase (.env.local) para guardar de verdad.
        </div>
        <Navbar email="vista-previa@demo" />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </div>
    );
  }

  const supabase = await createServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Segunda barrera además del middleware: nunca renderizar el área privada sin sesión.
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen">
      <Navbar email={user.email ?? ''} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
