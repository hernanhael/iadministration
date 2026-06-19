import { formatearMonto } from '@/lib/formateo';
import type { Planilla } from '@/types/modelos';

interface Props {
  totalIngresos: number;
  totalEgresos: number;
  planillasIngresos: Planilla[];
  planillasEgresos: Planilla[];
  porPlanillaIngresos: Record<string, number>;
  porPlanillaEgresos: Record<string, number>;
}

function Desglose({
  planillas,
  porPlanilla,
  tono,
}: {
  planillas: Planilla[];
  porPlanilla: Record<string, number>;
  tono: 'success' | 'danger';
}) {
  if (planillas.length === 0) return null;
  return (
    <div className="mt-3 flex flex-col gap-0.5 border-t border-border pt-2">
      {planillas.map((p) => (
        <div key={p.id} className="flex items-center justify-between text-xs">
          <span className="text-muted">{p.nombre}</span>
          <span
            className={`tabular font-semibold ${tono === 'success' ? 'text-emerald-400' : 'text-danger'}`}
          >
            {formatearMonto(porPlanilla[p.id] ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ResumenCards({
  totalIngresos,
  totalEgresos,
  planillasIngresos,
  planillasEgresos,
  porPlanillaIngresos,
  porPlanillaEgresos,
}: Props) {
  const resultado = totalIngresos - totalEgresos;
  const signo = resultado >= 0 ? '+' : '';

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {/* Ingresos */}
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-4">
        <p className="text-sm text-emerald-400/80">Ingresos</p>
        <p className="mt-1 text-2xl font-extrabold tabular text-emerald-400">
          {formatearMonto(totalIngresos)}
        </p>
        <Desglose planillas={planillasIngresos} porPlanilla={porPlanillaIngresos} tono="success" />
      </div>

      {/* Egresos */}
      <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4">
        <p className="text-sm text-danger/80">Egresos</p>
        <p className="mt-1 text-2xl font-extrabold tabular text-danger">
          {formatearMonto(totalEgresos)}
        </p>
        <Desglose planillas={planillasEgresos} porPlanilla={porPlanillaEgresos} tono="danger" />
      </div>

      {/* Resultado (siempre gris; centrado vertical y horizontalmente) */}
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface p-4 text-center">
        <p className="text-sm text-muted">Resultado</p>
        <p className="mt-2 text-3xl font-extrabold tabular text-foreground">
          {signo}{formatearMonto(resultado)}
        </p>
      </div>
    </div>
  );
}
