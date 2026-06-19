'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconPuntosV } from './icons';

export interface AccionMenu {
  label: string;
  onClick: () => void;
  peligro?: boolean;
}

export function MenuAcciones({ acciones }: { acciones: AccionMenu[] }) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function abrir() {
    if (!abierto) {
      const r = triggerRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setAbierto((a) => !a);
  }

  // El menú se monta por portal en el body: así no hereda la `opacity` de las
  // filas pagadas (atenuadas), que lo hacía verse transparente.
  useEffect(() => {
    if (!abierto) return;
    const alClickear = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !menuRef.current?.contains(t)) setAbierto(false);
    };
    const cerrar = () => setAbierto(false);
    document.addEventListener('mousedown', alClickear);
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    return () => {
      document.removeEventListener('mousedown', alClickear);
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
    };
  }, [abierto]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Más acciones"
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={abrir}
        className="flex h-9 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        <IconPuntosV />
      </button>

      {abierto &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: 'fixed', top: pos.top, right: pos.right }}
            className="z-50 w-48 rounded-xl border border-border bg-surface p-1 shadow-xl"
          >
            {acciones.map((a, i) => (
              <button
                key={i}
                type="button"
                role="menuitem"
                onClick={() => {
                  setAbierto(false);
                  a.onClick();
                }}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-surface-2 ${
                  a.peligro ? 'text-danger' : 'text-foreground'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
