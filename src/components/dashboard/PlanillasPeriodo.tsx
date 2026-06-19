'use client';

import { useMemo, useState } from 'react';
import type { GastoConServicio, Planilla } from '@/types/modelos';
import { formatearMonto, porNombre } from '@/lib/formateo';
import { GrillaGastos } from './GrillaGastos';
import {
  IconBasura,
  IconCandado,
  IconCandadoAbierto,
  IconChevron,
  IconLapiz,
} from '@/components/ui/icons';

// Botón de ícono sin contorno ni fondo (solo el ícono; fondo sutil al pasar el mouse).
const iconoSuelto =
  'flex h-9 w-9 items-center justify-center rounded-lg transition-colors text-muted hover:bg-surface-2 hover:text-foreground';

interface Props {
  gastos: GastoConServicio[];
  /** Planillas del usuario (definen orden, etiqueta y detalle de cada sección). */
  planillas: Planilla[];
  soloLectura?: boolean;
  /** Permitir contraer/expandir cada planilla (default true). */
  colapsable?: boolean;
  /** Ocultar las planillas que no tienen gastos (default false). */
  ocultarVacias?: boolean;
  onFoto?: (g: GastoConServicio, archivo: File) => void;
  onDoc?: (g: GastoConServicio) => void;
  onEditarServicio?: (g: GastoConServicio) => void;
  onEditarGasto?: (g: GastoConServicio) => void;
  onEliminar?: (g: GastoConServicio) => void;
  onTogglePago?: (g: GastoConServicio) => void;
  onCargas?: (g: GastoConServicio) => void;
  // Gestión de la planilla, desde su propio encabezado (⋯) y el pie de la pila.
  onEditarPlanilla?: (p: Planilla) => void;
  onAgregarServicio?: (p: Planilla) => void;
  onEliminarPlanilla?: (p: Planilla) => void;
}

/** Una sección por planilla, apiladas, con su total al pie. */
export function PlanillasPeriodo({
  gastos,
  planillas,
  soloLectura,
  colapsable = true,
  ocultarVacias = false,
  onEditarPlanilla,
  onAgregarServicio,
  onEliminarPlanilla,
  ...handlers
}: Props) {
  const [colapsadas, setColapsadas] = useState<Record<string, boolean>>({});
  // Planillas desbloqueadas (modo edición). Por defecto bloqueadas (candado cerrado).
  const [desbloqueadas, setDesbloqueadas] = useState<Record<string, boolean>>({});

  const porPlanilla = useMemo(() => {
    const map: Record<string, GastoConServicio[]> = {};
    for (const p of planillas) map[p.id] = [];
    for (const g of gastos) {
      const id = g.servicios?.planilla_id;
      if (id && map[id]) map[id].push(g);
    }
    for (const id of Object.keys(map)) {
      map[id].sort((a, b) =>
        porNombre({ nombre: a.servicios?.nombre ?? '' }, { nombre: b.servicios?.nombre ?? '' }),
      );
    }
    return map;
  }, [gastos, planillas]);

  const totales = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of planillas) {
      map[p.id] = (porPlanilla[p.id] ?? []).reduce((s, g) => s + (g.monto ?? 0), 0);
    }
    return map;
  }, [porPlanilla, planillas]);

  const visibles = planillas.filter((p) => !ocultarVacias || (porPlanilla[p.id]?.length ?? 0) > 0);
  const gestionable = !soloLectura && Boolean(onEditarPlanilla);

  return (
    <>
      {visibles.map((p) => {
        const colapsada = colapsable && (colapsadas[p.id] ?? false);
        const desbloqueada = gestionable && (desbloqueadas[p.id] ?? false);
        const esIngreso = p.tipo === 'ingreso';
        const grilla = !colapsada && (
          <GrillaGastos
            gastos={porPlanilla[p.id] ?? []}
            pieTotal={{ label: p.nombre, monto: totales[p.id] }}
            colorPie={esIngreso ? 'success' : 'danger'}
            sinVencimiento={esIngreso}
            soloLectura={soloLectura}
            puedeEditar={desbloqueada}
            onAgregarServicio={() => onAgregarServicio?.(p)}
            {...handlers}
          />
        );

        const titulo = (
          <h2 className="text-lg font-bold">
            {p.nombre}
            {p.detalle && (
              <span className="ml-2 text-xs font-normal text-muted/80">{p.detalle}</span>
            )}
          </h2>
        );

        return (
          <section key={p.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-1">
              {colapsable ? (
                <button
                  type="button"
                  aria-expanded={!colapsada}
                  onClick={() => setColapsadas((c) => ({ ...c, [p.id]: !colapsada }))}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <IconChevron
                    size={18}
                    className={`text-muted transition-transform ${colapsada ? '-rotate-90' : ''}`}
                  />
                  {titulo}
                  {colapsada && (
                    <span className="ml-auto tabular text-sm font-semibold text-muted">
                      {formatearMonto(totales[p.id])}
                    </span>
                  )}
                </button>
              ) : (
                <div className="flex-1">{titulo}</div>
              )}
              {/* Con la planilla colapsada se ocultan los controles de gestión
                  (candado, lápiz, papelera): solo se ven con la sección abierta. */}
              {gestionable && !colapsada && (
                <div className="flex items-center gap-0.5">
                  {/* Con la planilla desbloqueada: editar su nombre/color o eliminarla. */}
                  {desbloqueada && (
                    <>
                      <button
                        type="button"
                        aria-label="Editar planilla"
                        title="Editar planilla"
                        onClick={() => onEditarPlanilla?.(p)}
                        className={iconoSuelto}
                      >
                        <IconLapiz size={18} />
                      </button>
                      <button
                        type="button"
                        aria-label="Eliminar planilla"
                        title="Eliminar planilla"
                        onClick={() => onEliminarPlanilla?.(p)}
                        className={`${iconoSuelto} hover:text-danger`}
                      >
                        <IconBasura size={18} />
                      </button>
                    </>
                  )}
                  {/* Candado: solo el ícono (sin contorno ni fondo). Bloquea/desbloquea la edición. */}
                  <button
                    type="button"
                    aria-label={desbloqueada ? 'Bloquear planilla' : 'Desbloquear planilla para editar'}
                    title={desbloqueada ? 'Bloquear planilla' : 'Desbloquear para editar'}
                    aria-pressed={desbloqueada}
                    onClick={() => setDesbloqueadas((d) => ({ ...d, [p.id]: !desbloqueada }))}
                    className={
                      desbloqueada
                        ? 'flex h-9 w-9 items-center justify-center rounded-lg text-brand transition-colors hover:bg-surface-2'
                        : iconoSuelto
                    }
                  >
                    {desbloqueada ? <IconCandadoAbierto size={18} /> : <IconCandado size={18} />}
                  </button>
                </div>
              )}
            </div>
            {grilla}
          </section>
        );
      })}
    </>
  );
}
