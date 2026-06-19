'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { registrarse, type AuthState } from '../actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { FormMessage } from '@/components/ui/FormMessage';

const inicial: AuthState = {};

export default function RegistroPage() {
  const [state, action, pending] = useActionState(registrarse, inicial);

  return (
    <form action={action} className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">Crear cuenta</h2>

      {state.error && <FormMessage tipo="error">{state.error}</FormMessage>}
      {state.message && <FormMessage tipo="success">{state.message}</FormMessage>}

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="vos@ejemplo.com" />
      </div>

      <div>
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={6} />
        <p className="mt-1 text-xs text-muted">Mínimo 6 caracteres.</p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Creando…' : 'Crear cuenta'}
      </Button>

      <p className="text-center text-sm text-muted">
        ¿Ya tenés cuenta?{' '}
        <Link href="/login" className="font-semibold text-brand hover:text-brand-hover">Iniciar sesión</Link>
      </p>
    </form>
  );
}
