'use client';

import { useEffect, useRef, useState } from 'react';
import { cerrarSesion } from '@/app/(auth)/actions';
import { usePlanillas } from '@/hooks/usePlanillas';
import { ModalPlanilla } from '@/components/servicios/ModalPlanilla';
import { IconChevron, IconMas } from '@/components/ui/icons';

/** Botón de usuario con un menú: crear una planilla nueva o cerrar sesión. */
export function MenuUsuario({ email }: { email: string }) {
  const [abierto, setAbierto] = useState(false);
  const [modal, setModal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pl = usePlanillas();

  useEffect(() => {
    if (!abierto) return;
    const alClickear = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAbierto(false);
    };
    const alEscapar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', alClickear);
    document.addEventListener('keydown', alEscapar);
    return () => {
      document.removeEventListener('mousedown', alClickear);
      document.removeEventListener('keydown', alEscapar);
    };
  }, [abierto]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label="Menú de usuario"
        className="flex items-center gap-1.5 rounded-lg p-1 text-muted transition-colors hover:text-foreground"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-sm font-bold uppercase text-foreground">
          {email.slice(0, 1)}
        </span>
        <IconChevron size={16} className={`transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1 w-60 rounded-xl border border-border bg-surface p-1 shadow-xl"
        >
          <p className="truncate px-3 py-2 text-xs text-muted">{email}</p>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setAbierto(false);
              setModal(true);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-foreground transition-colors hover:bg-surface-2"
          >
            <IconMas size={16} /> Nueva planilla
          </button>
          <form action={cerrarSesion}>
            <button
              type="submit"
              role="menuitem"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-danger"
            >
              Salir
            </button>
          </form>
        </div>
      )}

      {modal && (
        <ModalPlanilla
          abierto
          onCerrar={() => setModal(false)}
          onGuardar={async (input) => {
            await pl.crear(input);
            // El menú es global y cada pantalla carga sus propios datos: tras crear,
            // vamos al Mes recargado para ver (y poblar) la planilla nueva.
            if (typeof window !== 'undefined') window.location.assign('/dashboard');
          }}
        />
      )}
    </div>
  );
}
