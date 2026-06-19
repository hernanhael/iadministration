'use client';

import { useEffect, useRef, useState } from 'react';
import { IconChevron, IconCheck } from './icons';

export interface Opcion {
  value: string;
  label: string;
  /** Encabezado de grupo (como un <optgroup>); se muestra al cambiar de grupo. */
  grupo?: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  opciones: Opcion[];
  id?: string;
  /** Texto cuando no hay coincidencia para el valor actual. */
  placeholder?: string;
}

/**
 * Desplegable con el diseño del proyecto (reemplaza al <select> nativo, cuyo
 * listado lo pinta el sistema operativo y rompe el tema oscuro). Mismo lenguaje
 * visual que SelectorMes: disparador tipo input, popup oscuro, hover gris.
 */
export function SelectorOpciones({ value, onChange, opciones, id, placeholder = 'Elegí…' }: Props) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const actual = opciones.find((o) => o.value === value);

  useEffect(() => {
    if (!abierto) return;
    const alClickear = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', alClickear);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('mousedown', alClickear);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierto]);

  function elegir(v: string) {
    onChange(v);
    setAbierto(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        onClick={() => setAbierto((a) => !a)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors hover:border-muted focus:border-muted focus:ring-2 focus:ring-muted/30"
      >
        <span className="truncate">{actual ? actual.label : placeholder}</span>
        <IconChevron
          size={16}
          className={`shrink-0 text-muted transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>

      {abierto && (
        <div
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border bg-surface p-1 shadow-xl"
        >
          {opciones.map((o, i) => {
            const seleccionado = o.value === value;
            const nuevoGrupo = o.grupo && o.grupo !== opciones[i - 1]?.grupo;
            return (
              <div key={o.value}>
                {nuevoGrupo && (
                  <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted/70">
                    {o.grupo}
                  </p>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={seleccionado}
                  onClick={() => elegir(o.value)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    seleccionado
                      ? 'bg-surface-2 font-semibold text-foreground'
                      : 'text-muted hover:bg-surface-2 hover:text-foreground'
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  {seleccionado && <IconCheck size={15} className="shrink-0 text-foreground" />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
