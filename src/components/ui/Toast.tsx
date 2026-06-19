'use client';

import { useEffect } from 'react';

type Tono = 'info' | 'success' | 'error';

interface Props {
  /** Texto a mostrar; si es null/'' el toast no se renderiza. */
  mensaje: string | null;
  onCerrar: () => void;
  tono?: Tono;
  /** Milisegundos antes de auto-cerrar (0 = no auto-cierra). */
  duracion?: number;
}

const acento: Record<Tono, string> = {
  info: 'border-l-muted',
  success: 'border-l-brand',
  error: 'border-l-danger',
};

/** Aviso flotante y efímero (feedback de acciones), abajo y centrado. */
export function Toast({ mensaje, onCerrar, tono = 'info', duracion = 4000 }: Props) {
  useEffect(() => {
    if (!mensaje || duracion <= 0) return;
    const t = setTimeout(onCerrar, duracion);
    return () => clearTimeout(t);
  }, [mensaje, duracion, onCerrar]);

  if (!mensaje) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className={`animate-toast-in pointer-events-auto flex max-w-md items-start gap-3 rounded-xl border border-l-4 border-border bg-surface-2 px-4 py-3 shadow-xl ${acento[tono]}`}
      >
        <p className="text-sm text-foreground">{mensaje}</p>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar aviso"
          className="-mr-1 shrink-0 rounded-md px-1.5 text-lg leading-none text-muted transition-colors hover:text-foreground"
        >
          ×
        </button>
      </div>
    </div>
  );
}
