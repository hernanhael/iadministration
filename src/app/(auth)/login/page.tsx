'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { iniciarSesion, type AuthState } from '../actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { FormMessage } from '@/components/ui/FormMessage';

const inicial: AuthState = {};

export default function LoginPage() {
  const [state, action, pending] = useActionState(iniciarSesion, inicial);

  return (
    <form action={action} className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">Iniciar sesión</h2>

      {state.error && <FormMessage tipo="error">{state.error}</FormMessage>}

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="vos@ejemplo.com" />
      </div>

      <div>
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Ingresando…' : 'Ingresar'}
      </Button>

      <div className="flex items-center justify-between text-sm text-muted">
        <Link href="/recuperar" className="hover:text-foreground">¿Olvidaste tu clave?</Link>
        <Link href="/registro" className="font-semibold text-brand hover:text-brand-hover">Crear cuenta</Link>
      </div>
    </form>
  );
}
