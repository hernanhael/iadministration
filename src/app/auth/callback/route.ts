import { NextResponse } from 'next/server';
import { createServerAuthClient } from '@/lib/supabase/auth-server';

// Destino de los enlaces de email (confirmación de cuenta y recuperación de clave).
// Intercambia el código por una sesión y redirige.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createServerAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=enlace_invalido`);
}
