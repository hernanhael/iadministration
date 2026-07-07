'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { formatearPeriodo } from '@/lib/formateo';
import { IconChevron } from './icons';

const DIAS_SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

function parsear(v: string): { y: number; m: number; d: number } | null {
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return { d: Number(m[1]), m: Number(m[2]), y: Number(m[3]) };
}

function diasDelMes(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

/** Día de la semana del 1° del mes, con la semana arrancando en lunes (0 = lunes). */
function offsetPrimerDia(y: number, m: number): number {
  return (new Date(y, m - 1, 1).getDay() + 6) % 7;
}

interface Props {
  /** Fecha seleccionada en formato 'dd/mm/aaaa' (puede venir vacía o incompleta). */
  value: string;
  onElegir: (value: string) => void;
  /** El disparador del desplegable lo define quien lo usa: recibe si está abierto
   *  y la función para abrirlo/cerrarlo. */
  children: (args: { abierto: boolean; alternar: () => void }) => ReactNode;
  /** Lado desde el que cuelga el desplegable respecto del disparador (default 'left'). */
  align?: 'left' | 'right';
}

/** Calendario desplegable reutilizable: navegación de mes con chevrons + grilla de
 *  días, mismo lenguaje visual que el resto de la app (ver SelectorMes). Se usa tanto
 *  en SelectorFecha (formularios) como en las celdas editables de GrillaGastos. */
export function CalendarioMensual({ value, onElegir, children, align = 'left' }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState(() => {
    const hoy = new Date();
    return parsear(value) ?? { y: hoy.getFullYear(), m: hoy.getMonth() + 1, d: 0 };
  });
  const ref = useRef<HTMLDivElement>(null);
  const sel = parsear(value);

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

  function alternar() {
    setAbierto((estaba) => {
      if (!estaba) {
        const hoy = new Date();
        setVista(parsear(value) ?? { y: hoy.getFullYear(), m: hoy.getMonth() + 1, d: 0 });
      }
      return !estaba;
    });
  }

  function cambiarMes(delta: number) {
    setVista((v) => {
      const total = v.m - 1 + delta;
      const y = v.y + Math.floor(total / 12);
      const m = ((total % 12) + 12) % 12;
      return { ...v, y, m: m + 1 };
    });
  }

  function elegir(d: number) {
    onElegir(`${String(d).padStart(2, '0')}/${String(vista.m).padStart(2, '0')}/${vista.y}`);
    setAbierto(false);
  }

  const total = diasDelMes(vista.y, vista.m);
  const offset = offsetPrimerDia(vista.y, vista.m);
  const celdas: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];

  return (
    <div ref={ref} className="relative">
      {children({ abierto, alternar })}

      {abierto && (
        <div
          className={`absolute z-30 mt-1 w-64 rounded-xl border border-border bg-surface p-3 shadow-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Mes anterior"
              onClick={() => cambiarMes(-1)}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <IconChevron size={16} className="rotate-90" />
            </button>
            <span className="tabular text-sm font-bold">
              {formatearPeriodo(`${vista.y}-${String(vista.m).padStart(2, '0')}`)}
            </span>
            <button
              type="button"
              aria-label="Mes siguiente"
              onClick={() => cambiarMes(1)}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <IconChevron size={16} className="-rotate-90" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[0.65rem] font-semibold uppercase text-muted">
            {DIAS_SEMANA.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {celdas.map((d, i) => {
              if (d === null) return <span key={`vacio-${i}`} />;
              const seleccionado = sel?.y === vista.y && sel?.m === vista.m && sel?.d === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => elegir(d)}
                  className={`rounded-lg py-1.5 text-sm font-semibold transition-colors ${
                    seleccionado
                      ? 'bg-muted/25 text-foreground ring-1 ring-inset ring-muted/50'
                      : 'text-foreground hover:bg-surface-2'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
