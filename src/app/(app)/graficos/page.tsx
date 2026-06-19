'use client';

import { useMemo, useState } from 'react';
import { useGastos } from '@/hooks/useGastos';
import { usePlanillas } from '@/hooks/usePlanillas';
import { useServicios } from '@/hooks/useServicios';
import { GraficoEvolucion } from '@/components/graficos/GraficoEvolucion';
import { Button } from '@/components/ui/Button';
import { SelectorOpciones } from '@/components/ui/SelectorOpciones';
import { SelectorMes } from '@/components/ui/SelectorMes';
import { Toast } from '@/components/ui/Toast';
import { periodoActual, porNombre, sumarMeses } from '@/lib/formateo';
import { agregadosInforme, generarInforme } from '@/lib/informe';
import { SUPABASE_CONFIGURADO } from '@/lib/preview';

const TITULOS = ['Resumen', 'Evolución', 'Observaciones'];

export default function GraficosPage() {
  const { gastos, cargando } = useGastos();
  const { planillas } = usePlanillas();
  const { servicios } = useServicios();

  // Rango de meses con datos (para acotar el selector del informe).
  const periodos = useMemo(
    () => [...new Set(gastos.map((g) => g.periodo))].sort(),
    [gastos],
  );
  const actual = periodoActual();
  const minPer = periodos[0] ?? sumarMeses(actual, -5);

  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [alcance, setAlcance] = useState('todo');
  const [aviso, setAviso] = useState<string | null>(null);
  const [informe, setInforme] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);

  const desdeEf = desde || minPer;
  const hastaEf = hasta || actual;

  async function generar() {
    const alcanceNombre = planillas.find((p) => p.id === alcance)?.nombre;
    const datos = agregadosInforme(gastos, desdeEf, hastaEf, alcance, alcanceNombre);
    if (datos.meses.length === 0) {
      setAviso('No hay datos en el período elegido.');
      return;
    }
    setGenerando(true);
    setInforme(null);
    try {
      setInforme(await generarInforme(datos));
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo generar el informe.');
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Gráficos e Informes</h1>
        <p className="text-sm text-muted">Evolución de tus gastos e ingresos e informes.</p>
      </div>

      {cargando ? (
        <p className="py-10 text-center text-sm text-muted">Cargando…</p>
      ) : (
        <GraficoEvolucion gastos={gastos} planillas={planillas} servicios={servicios} />
      )}

      {/* Informes (IA) */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-bold">Informe con IA</h2>
        <p className="mb-4 text-sm text-muted">
          Generá un informe redactado automáticamente con resumen, evolución y observaciones
          {!SUPABASE_CONFIGURADO && ' (en modo vista previa el texto es simulado)'}.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Desde</span>
            <SelectorMes value={desdeEf} min={minPer} max={hastaEf} onChange={setDesde} />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Hasta</span>
            <SelectorMes value={hastaEf} min={desdeEf} max={actual} onChange={setHasta} />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Alcance</span>
            <SelectorOpciones
              value={alcance}
              onChange={setAlcance}
              opciones={[
                { value: 'todo', label: 'Todas las planillas' },
                ...[...planillas]
                  .sort(porNombre)
                  .map((p) => ({ value: p.id, label: `Solo ${p.nombre}` })),
              ]}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={generar} disabled={generando}>
            {generando ? 'Generando…' : informe ? 'Generar de nuevo' : 'Generar informe'}
          </Button>
        </div>

        {informe && (
          <div className="mt-4 rounded-xl border border-border bg-background p-4">
            {informe.split('\n').map((linea, i) => {
              const t = linea.trim();
              if (t === '') return <div key={i} className="h-2" aria-hidden />;
              return TITULOS.includes(t) ? (
                <h3 key={i} className="mb-1 mt-3 text-sm font-bold first:mt-0">
                  {t}
                </h3>
              ) : (
                <p key={i} className="text-sm leading-relaxed text-muted">
                  {linea}
                </p>
              );
            })}
          </div>
        )}
      </div>

      <Toast mensaje={aviso} onCerrar={() => setAviso(null)} />
    </div>
  );
}
