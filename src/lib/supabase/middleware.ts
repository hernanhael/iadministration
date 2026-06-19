import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SUPABASE_CONFIGURADO } from '@/lib/preview';

// Rutas que requieren sesión. Si no hay usuario, se redirige a /login.
const RUTAS_PROTEGIDAS = ['/dashboard', '/servicios', '/informes', '/historial'];
// Rutas de autenticación: si ya hay sesión, se redirige al dashboard.
const RUTAS_AUTH = ['/login', '/registro', '/recuperar'];

export async function updateSession(request: NextRequest) {
  // Modo vista previa: sin Supabase no hay sesión que gestionar ni rutas que proteger.
  if (!SUPABASE_CONFIGURADO) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: getUser() revalida el token contra Supabase y refresca cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const esProtegida = RUTAS_PROTEGIDAS.some((r) => path.startsWith(r));
  const esAuth = RUTAS_AUTH.some((r) => path.startsWith(r));

  if (!user && esProtegida) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && esAuth) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}
