'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createServerAuthClient } from '@/lib/supabase/auth-server';
import { SUPABASE_CONFIGURADO, ERROR_PREVIEW } from '@/lib/preview';

export type AuthState = { error?: string; message?: string };

// Traduce los mensajes de error más comunes de Supabase Auth al español.
function traducirError(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email o contraseña incorrectos.';
  if (m.includes('user already registered')) return 'Ya existe una cuenta con ese email.';
  if (m.includes('email not confirmed')) return 'Confirmá tu cuenta desde el email que te enviamos.';
  if (m.includes('password should be at least')) return 'La contraseña es demasiado corta (mínimo 6 caracteres).';
  if (m.includes('unable to validate email')) return 'El email no es válido.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos. Esperá un momento e intentá de nuevo.';
  return 'Ocurrió un error. Intentá nuevamente.';
}

async function obtenerOrigen() {
  const h = await headers();
  return h.get('origin') ?? `https://${h.get('host')}`;
}

export async function iniciarSesion(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!SUPABASE_CONFIGURADO) return { error: ERROR_PREVIEW };
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) return { error: 'Completá email y contraseña.' };

  const supabase = await createServerAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: traducirError(error.message) };

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function registrarse(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!SUPABASE_CONFIGURADO) return { error: ERROR_PREVIEW };
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) return { error: 'Completá email y contraseña.' };
  if (password.length < 6) return { error: 'La contraseña debe tener al menos 6 caracteres.' };

  const origin = await obtenerOrigen();
  const supabase = await createServerAuthClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) return { error: traducirError(error.message) };

  // Si la confirmación por email está activada, no hay sesión todavía.
  if (data.user && !data.session) {
    return { message: 'Te enviamos un email para confirmar tu cuenta. Revisá tu casilla.' };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function recuperarClave(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!SUPABASE_CONFIGURADO) return { error: ERROR_PREVIEW };
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { error: 'Ingresá tu email.' };

  const origin = await obtenerOrigen();
  const supabase = await createServerAuthClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/actualizar-clave`,
  });

  // Respuesta neutra para no revelar si el email existe.
  return { message: 'Si el email está registrado, te enviamos instrucciones para recuperar tu clave.' };
}

export async function actualizarClave(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!SUPABASE_CONFIGURADO) return { error: ERROR_PREVIEW };
  const password = String(formData.get('password') ?? '');
  if (password.length < 6) return { error: 'La contraseña debe tener al menos 6 caracteres.' };

  const supabase = await createServerAuthClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: traducirError(error.message) };

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function cerrarSesion() {
  if (!SUPABASE_CONFIGURADO) redirect('/login');
  const supabase = await createServerAuthClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
