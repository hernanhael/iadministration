'use client';

import { useMemo, useState } from 'react';
import { useGastos } from '@/hooks/useGastos';
import { usePlanillas } from '@/hooks/usePlanillas';
import { PlanillasPeriodo } from '@/components/dashboard/PlanillasPeriodo';
import { TabTipo } from '@/components/ui/TabTipo';
import { SelectorMes } from '@/components/ui/SelectorMes';
import { IconChevron } from '@/components/ui/icons';
import { formatearMonto, periodoActual, sumarMeses } from '@/lib/formateo';

const actual = periodoActual();

export default function HistoricoPage() {
  const { gastos, cargando } = useGastos();
  const { planillas } = usePlanillas({ incluirInactivas: true });

  const [tipo, setTipo] = useState<'egreso' | 'ingreso'>('egreso');

  // Planillas del tipo activo
  const planillasDelTipo = useMemo(
    () => planillas.filter((p) => p.tipo === tipo),
    [planillas, tipo],
  );

  // Meses ya cerrados con datos para el tipo activo
  const periodos = useMemo(() => {
    const set = new Set<string>();
    for (const g of gastos) {
      if (g.periodo < actual && g.servicios?.planillas?.tipo === tipo) set.add(g.periodo);
    }
    return [...set].sort().reverse();
  }, [gastos, tipo]);

  const masReciente = periodos[0] ?? '';
  const masAntiguo = periodos[periodos.length - 1] ?? '';

  const [elegido, setElegido] = useState('');
  const periodo =
    elegido && elegido >= masAntiguo && elegido <= masReciente ? elegido : masReciente;

  const delPeriodo = useMemo(
    () => gastos.filter((g) => g.periodo === periodo && g.servicios?.planillas?.tipo === tipo),
    [gastos, periodo, tipo],
  );

  const total = useMemo(
    () => delPeriodo.reduce((s, g) => s + (g.monto ?? 0), 0),
    [delPeriodo],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Título con selector Ingresos/Egresos a la derecha */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Histórico</h1>
          <p className="text-sm text-muted">Consultá los {tipo === 'egreso' ? 'gastos' : 'ingresos'} de los meses anteriores.</p>
        </div>
        <TabTipo valor={tipo} onChange={(t) => { setTipo(t); setElegido(''); }} />
      </div>

      {cargando ? (
        <p className="py-10 text-center text-sm text-muted">Cargando…</p>
      ) : periodos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">
          {tipo === 'egreso'
            ? 'Todavía no hay meses cerrados. Cuando termine el mes en curso, vas a poder consultarlo acá.'
            : 'Todavía no hay ingresos registrados en meses anteriores.'}
        </p>
      ) : (
        <>
          {/* Renglón compacto: stepper de mes (flechas + almanaque) + total */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-3 py-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Mes anterior"
                disabled={periodo <= masAntiguo}
                onClick={() => setElegido(sumarMeses(periodo, -1))}
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
              >
                <IconChevron size={18} className="rotate-90" />
              </button>

              <SelectorMes
                value={periodo}
                min={masAntiguo}
                max={masReciente}
                onChange={setElegido}
                variant="inline"
              />

              <button
                type="button"
                aria-label="Mes siguiente"
                disabled={periodo >= masReciente}
                onClick={() => setElegido(sumarMeses(periodo, 1))}
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
              >
                <IconChevron size={18} className="-rotate-90" />
              </button>
            </div>

            <div className="flex items-baseline gap-2 pr-1">
              <span className="text-sm text-muted">
                {tipo === 'egreso' ? 'Total gastado' : 'Total cobrado'}
              </span>
              <span className={`tabular text-xl font-extrabold ${tipo === 'egreso' ? 'text-danger' : 'text-emerald-400'}`}>
                {formatearMonto(total)}
              </span>
            </div>
          </div>

          {delPeriodo.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">
              {tipo === 'egreso'
                ? 'No hubo gastos registrados en este mes.'
                : 'No hubo ingresos registrados en este mes.'}
            </p>
          ) : (
            <PlanillasPeriodo
              gastos={delPeriodo}
              planillas={planillasDelTipo}
              soloLectura
              colapsable={false}
              ocultarVacias
            />
          )}
        </>
      )}
    </div>
  );
}
