'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { formatearPeriodo, hoyArgentina } from '@/lib/formateo';
import { IconChevron } from './icons';

const DIAS_SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
const ANCHO_POPOVER = 256; // w-64
const ALTO_POPOVER_APROX = 300;
const MARGEN_VIEWPORT = 8;

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
 *  en SelectorFecha (formularios) como en las celdas editables de GrillaGastos.
 *
 *  El desplegable se renderiza por portal a `document.body` (mismo patrón que
 *  `Modal`): así no hereda la opacidad reducida de una fila atenuada (ej. un
 *  gasto ya pagado) ni queda recortado por el `overflow-hidden` de la grilla,
 *  y se puede posicionar clamp-eado dentro del viewport en pantallas chicas. */
export function CalendarioMensual({ value, onElegir, children, align = 'left' }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState(() => {
    const [y, m] = hoyArgentina().split('-').map(Number);
    return parsear(value) ?? { y, m, d: 0 };
  });
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const sel = parsear(value);

  useEffect(() => {
    if (!abierto) return;
    const actualizarPos = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      let left = align === 'right' ? r.right - ANCHO_POPOVER : r.left;
      left = Math.min(Math.max(MARGEN_VIEWPORT, left), window.innerWidth - ANCHO_POPOVER - MARGEN_VIEWPORT);
      let top = r.bottom + 4;
      if (top + ALTO_POPOVER_APROX > window.innerHeight - MARGEN_VIEWPORT) {
        top = Math.max(MARGEN_VIEWPORT, r.top - ALTO_POPOVER_APROX - 4);
      }
      setPos({ top, left });
    };
    actualizarPos();
    window.addEventListener('resize', actualizarPos);
    window.addEventListener('scroll', actualizarPos, true);
    return () => {
      window.removeEventListener('resize', actualizarPos);
      window.removeEventListener('scroll', actualizarPos, true);
    };
  }, [abierto, align]);

  useEffect(() => {
    if (!abierto) return;
    const alClickear = (e: MouseEvent) => {
      const objetivo = e.target as Node;
      if (triggerRef.current?.contains(objetivo)) return;
      if (popRef.current?.contains(objetivo)) return;
      setAbierto(false);
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
        const [y, m] = hoyArgentina().split('-').map(Number);
        setVista(parsear(value) ?? { y, m, d: 0 });
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
    <div ref={triggerRef} className="relative">
      {children({ abierto, alternar })}

      {abierto && pos && createPortal(
        <div
          ref={popRef}
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-[60] w-64 rounded-xl border border-border bg-surface p-3 shadow-xl"
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
        </div>,
        document.body,
      )}
    </div>
  );
}
