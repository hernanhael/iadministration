'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { GastoConServicio, Planilla, ServicioConPlanilla } from '@/types/modelos';
import { formatearMonto, formatearPeriodo, periodoActual, porNombre, sumarMeses } from '@/lib/formateo';
import { SelectorMes } from '@/components/ui/SelectorMes';

/** Cómo se separan las líneas del gráfico. */
type Modo = 'total' | 'planilla' | 'servicio';

const compacto = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 });

// Mismo lenguaje visual que la barra de navegación: solo texto, hover gris
// (sin borde ni pastilla), seleccionado = relleno gris (nunca verde).
const pill = (activo: boolean) =>
  `rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
    activo
      ? 'bg-surface-2 text-foreground'
      : 'text-muted hover:bg-surface-2 hover:text-foreground'
  }`;

/** Grupo de botones tipo "pill" (mismo estilo que el resto de la app). */
function Pills<T extends string>({
  opciones,
  valor,
  onChange,
}: {
  opciones: { v: T; label: string }[];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)} className={pill(valor === o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Bloque de filtro con su etiqueta arriba. */
function Campo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{titulo}</span>
      {children}
    </div>
  );
}

/** Checkbox con el color de la planilla/servicio (el tilde toma ese color). */
function CheckColor({
  label,
  color,
  marcado,
  onChange,
}: {
  label: string;
  color: string;
  marcado: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-sm">
      <input
        type="checkbox"
        checked={marcado}
        onChange={onChange}
        className="h-4 w-4"
        style={{ accentColor: color }}
      />
      <span className={marcado ? 'text-foreground' : 'text-muted'}>{label}</span>
    </label>
  );
}

interface Props {
  gastos: GastoConServicio[];
  planillas: Planilla[];
  servicios: ServicioConPlanilla[];
}

export function GraficoEvolucion({ gastos, planillas, servicios }: Props) {
  const [modo, setModo] = useState<Modo>('total');
  const [selPlan, setSelPlan] = useState<Set<string>>(new Set());
  const [selServ, setSelServ] = useState<Set<string>>(new Set());
  const [desdeSel, setDesdeSel] = useState('');
  const [hastaSel, setHastaSel] = useState('');

  // Rango de meses con datos (límites del selector de tiempo).
  const periodosData = useMemo(() => [...new Set(gastos.map((g) => g.periodo))].sort(), [gastos]);
  const minPer = periodosData[0] ?? sumarMeses(periodoActual(), -5);
  const maxPer = periodosData[periodosData.length - 1] ?? periodoActual();
  const desde = desdeSel && desdeSel >= minPer ? desdeSel : minPer;
  const hasta = hastaSel && hastaSel <= maxPer ? hastaSel : maxPer;

  const planillasOrd = useMemo(() => [...planillas].sort(porNombre), [planillas]);
  const serviciosOrd = useMemo(() => [...servicios].sort(porNombre), [servicios]);

  // Por defecto vienen marcadas todas las planillas y todos los servicios.
  const iniPlan = useRef(false);
  const iniServ = useRef(false);
  useEffect(() => {
    if (iniPlan.current || planillas.length === 0) return;
    iniPlan.current = true;
    setSelPlan(new Set(planillas.map((p) => p.id)));
  }, [planillas]);
  useEffect(() => {
    if (iniServ.current || servicios.length === 0) return;
    iniServ.current = true;
    setSelServ(new Set(servicios.map((s) => s.id)));
  }, [servicios]);

  function alternar(set: Set<string>, setter: (s: Set<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  // Series (líneas) según el modo y lo tildado.
  const series = useMemo(() => {
    if (modo === 'total') return [{ key: 'Total', label: 'Total', color: 'var(--brand)', tipo: 'total' as const, ref: '' }];
    if (modo === 'planilla')
      return planillasOrd
        .filter((p) => selPlan.has(p.id))
        .map((p) => ({ key: `pl:${p.id}`, label: p.nombre, color: p.color, tipo: 'pl' as const, ref: p.id }));
    return serviciosOrd
      .filter((s) => selServ.has(s.id))
      .map((s) => ({ key: `sv:${s.id}`, label: s.nombre, color: s.color, tipo: 'sv' as const, ref: s.id }));
  }, [modo, planillasOrd, serviciosOrd, selPlan, selServ]);

  // Eje temporal continuo (incluye meses sin gasto dentro del rango).
  const meses = useMemo(() => {
    const out: string[] = [];
    let p = desde;
    while (p <= hasta && out.length < 240) {
      out.push(p);
      p = sumarMeses(p, 1);
    }
    return out;
  }, [desde, hasta]);

  const enRango = useMemo(
    () => gastos.filter((g) => g.periodo >= desde && g.periodo <= hasta),
    [gastos, desde, hasta],
  );

  const data = useMemo(() => {
    return meses.map((per) => {
      const delP = enRango.filter((g) => g.periodo === per);
      const row: Record<string, string | number> = { label: formatearPeriodo(per) };
      for (const c of series) {
        const monto = delP
          .filter((g) =>
            c.tipo === 'total'
              ? true
              : c.tipo === 'pl'
                ? g.servicios?.planilla_id === c.ref
                : g.servicio_id === c.ref,
          )
          .reduce((s, g) => s + (g.monto ?? 0), 0);
        row[c.key] = monto;
      }
      return row;
    });
  }, [meses, enRango, series]);

  const hayDatos = series.length > 0 && enRango.length > 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-4 font-bold">Evolución del gasto</h2>

      {/* Filtros: tiempo y modo de desglose */}
      <div className="mb-5 flex flex-col gap-4">
        <Campo titulo="Tiempo">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SelectorMes value={desde} min={minPer} max={hasta} onChange={setDesdeSel} />
            </div>
            <span className="text-sm text-muted">a</span>
            <div className="flex-1">
              <SelectorMes value={hasta} min={desde} max={maxPer} onChange={setHastaSel} />
            </div>
          </div>
        </Campo>

        <Campo titulo="Ver por">
          <Pills
            valor={modo}
            onChange={setModo}
            opciones={[
              { v: 'total', label: 'Todo' },
              { v: 'planilla', label: 'Planilla' },
              { v: 'servicio', label: 'Servicio' },
            ]}
          />
        </Campo>
      </div>

      {/* Gráfico: tiempo en el eje inferior, monto en el eje izquierdo */}
      {!hayDatos ? (
        <p className="py-16 text-center text-sm text-muted">
          {gastos.length === 0
            ? 'Todavía no hay gastos cargados para graficar.'
            : series.length === 0
              ? 'Tildá al menos una opción abajo.'
              : 'No hay gastos para los filtros elegidos.'}
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 12 }} stroke="var(--border)" />
            <YAxis
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
              stroke="var(--border)"
              tickFormatter={(v) => `$${compacto.format(v as number)}`}
              width={56}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                color: 'var(--foreground)',
              }}
              formatter={(v) => formatearMonto(v as number)}
            />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Checkboxes según el modo: planillas o servicios, en fila. "Todo" no necesita. */}
      {modo === 'planilla' && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-4">
          {planillasOrd.map((p) => (
            <CheckColor
              key={p.id}
              label={p.nombre}
              color={p.color}
              marcado={selPlan.has(p.id)}
              onChange={() => alternar(selPlan, setSelPlan, p.id)}
            />
          ))}
        </div>
      )}
      {modo === 'servicio' && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-4">
          {serviciosOrd.map((s) => (
            <CheckColor
              key={s.id}
              label={s.nombre}
              color={s.color}
              marcado={selServ.has(s.id)}
              onChange={() => alternar(selServ, setSelServ, s.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
