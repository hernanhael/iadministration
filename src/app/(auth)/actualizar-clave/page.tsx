'use client';

import { useActionState } from 'react';
import { actualizarClave, type AuthState } from '../actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { FormMessage } from '@/components/ui/FormMessage';

const inicial: AuthState = {};

export default function ActualizarClavePage() {
  const [state, action, pending] = useActionState(actualizarClave, inicial);

  return (
    <form action={action} className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">Nueva contraseña</h2>
      <p className="text-sm text-muted">Ingresá tu nueva clave para terminar.</p>

      {state.error && <FormMessage tipo="error">{state.error}</FormMessage>}

      <div>
        <Label htmlFor="password">Contraseña nueva</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={6} />
        <p className="mt-1 text-xs text-muted">Mínimo 6 caracteres.</p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar contraseña'}
      </Button>
    </form>
  );
}
