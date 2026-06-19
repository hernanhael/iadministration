'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { recuperarClave, type AuthState } from '../actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { FormMessage } from '@/components/ui/FormMessage';

const inicial: AuthState = {};

export default function RecuperarPage() {
  const [state, action, pending] = useActionState(recuperarClave, inicial);

  return (
    <form action={action} className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">Recuperar contraseña</h2>
      <p className="text-sm text-muted">
        Te enviamos un enlace para crear una nueva clave.
      </p>

      {state.error && <FormMessage tipo="error">{state.error}</FormMessage>}
      {state.message && <FormMessage tipo="success">{state.message}</FormMessage>}

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="vos@ejemplo.com" />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Enviando…' : 'Enviar enlace'}
      </Button>

      <p className="text-center text-sm text-muted">
        <Link href="/login" className="font-semibold text-brand hover:text-brand-hover">Volver a iniciar sesión</Link>
      </p>
    </form>
  );
}
