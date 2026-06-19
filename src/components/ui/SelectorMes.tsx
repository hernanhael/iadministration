'use client';

import { useEffect, useRef, useState } from 'react';
import { formatearPeriodo } from '@/lib/formateo';
import { IconChevron } from './icons';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

interface Props {
  /** Valor en formato 'YYYY-MM'. */
  value: string;
  onChange: (value: string) => void;
  /** Límites de selección (inclusive), en 'YYYY-MM'. */
  min?: string;
  max?: string;
  id?: string;
  /** 'caja' = disparador tipo input; 'inline' = solo el texto del mes (para steppers). */
  variant?: 'caja' | 'inline';
}

function parse(v: string): { y: number; m: number } | null {
  const [y, m] = v.split('-').map(Number);
  if (!y || !m) return null;
  return { y, m };
}

const clave = (y: number, m: number) => y * 100 + m;

/** Selector de mes/año con el diseño del proyecto (reemplaza al input nativo type="month"). */
export function SelectorMes({ value, onChange, min, max, id, variant = 'caja' }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [anio, setAnio] = useState(() => parse(value)?.y ?? new Date().getFullYear());
  const ref = useRef<HTMLDivElement>(null);

  const sel = parse(value);
  const minP = min ? parse(min) : null;
  const maxP = max ? parse(max) : null;

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

  function abrir() {
    setAnio(parse(value)?.y ?? new Date().getFullYear());
    setAbierto((a) => !a);
  }

  function fueraDeRango(y: number, m: number): boolean {
    const k = clave(y, m);
    if (minP && k < clave(minP.y, minP.m)) return true;
    if (maxP && k > clave(maxP.y, maxP.m)) return true;
    return false;
  }

  function elegir(m: number) {
    if (fueraDeRango(anio, m)) return;
    onChange(`${anio}-${String(m).padStart(2, '0')}`);
    setAbierto(false);
  }

  const puedeAnterior = !minP || anio > minP.y;
  const puedeSiguiente = !maxP || anio < maxP.y;

  return (
    <div ref={ref} className="relative">
      {variant === 'inline' ? (
        <button
          type="button"
          id={id}
          aria-haspopup="dialog"
          aria-expanded={abierto}
          onClick={abrir}
          className="min-w-[9.5rem] rounded-lg px-2 py-1 text-center text-base font-bold text-foreground outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-muted/30"
        >
          {sel ? formatearPeriodo(value) : 'Elegí un mes'}
        </button>
      ) : (
        <button
          type="button"
          id={id}
          aria-haspopup="dialog"
          aria-expanded={abierto}
          onClick={abrir}
          className="flex h-11 w-full items-center justify-between rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors hover:border-muted focus:border-muted focus:ring-2 focus:ring-muted/30"
        >
          <span>{sel ? formatearPeriodo(value) : 'Elegí un mes'}</span>
          <IconChevron
            size={16}
            className={`text-muted transition-transform ${abierto ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      {abierto && (
        <div
          className={`absolute z-30 mt-1 w-60 rounded-xl border border-border bg-surface p-3 shadow-xl ${
            variant === 'inline' ? 'left-1/2 -translate-x-1/2' : 'right-0'
          }`}
        >
          {/* Navegación de año */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Año anterior"
              disabled={!puedeAnterior}
              onClick={() => setAnio((a) => a - 1)}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
            >
              <IconChevron size={16} className="rotate-90" />
            </button>
            <span className="tabular text-sm font-bold">{anio}</span>
            <button
              type="button"
              aria-label="Año siguiente"
              disabled={!puedeSiguiente}
              onClick={() => setAnio((a) => a + 1)}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
            >
              <IconChevron size={16} className="-rotate-90" />
            </button>
          </div>

          {/* Grilla de meses */}
          <div className="grid grid-cols-3 gap-1">
            {MESES.map((nombre, i) => {
              const m = i + 1;
              const seleccionado = sel?.y === anio && sel?.m === m;
              const deshabilitado = fueraDeRango(anio, m);
              return (
                <button
                  key={m}
                  type="button"
                  disabled={deshabilitado}
                  onClick={() => elegir(m)}
                  className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                    seleccionado
                      ? 'bg-muted/25 text-foreground ring-1 ring-inset ring-muted/50'
                      : deshabilitado
                        ? 'cursor-not-allowed text-muted/40'
                        : 'text-foreground hover:bg-surface-2'
                  }`}
                >
                  {nombre}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
