// Cliente del informe con IA (Fase 5). Arma los agregados numéricos del período
// y pide un informe redactado. En modo vista previa (sin Supabase) lo simula a
// partir de los mismos números, para probar el flujo sin backend ni API key.
import { SUPABASE_CONFIGURADO } from './preview';
import { formatearMonto, formatearPeriodo } from './formateo';
import type { GastoConServicio } from '@/types/modelos';

export interface DatosInforme {
  desde: string;
  hasta: string;
  alcance: string;
  total: number;
  pagado: number;
  meses: { periodo: string; total: number; pagado: number }[];
  servicios: { nombre: string; total: number }[];
  areas: { area: string; total: number }[];
}

/** Construye los agregados (solo números + etiquetas) que viajan al modelo. */
export function agregadosInforme(
  gastos: GastoConServicio[],
  desde: string,
  hasta: string,
  alcance: 'todo' | string, // 'todo' o el id de una planilla
  alcanceNombre?: string,
): DatosInforme {
  const filtrados = gastos.filter((g) => {
    if (g.periodo < desde || g.periodo > hasta) return false;
    if (alcance !== 'todo' && g.servicios?.planilla_id !== alcance) return false;
    return true;
  });

  const mesMap = new Map<string, { total: number; pagado: number }>();
  const servMap = new Map<string, number>();
  const areaMap = new Map<string, number>();
  let total = 0;
  let pagado = 0;

  for (const g of filtrados) {
    const monto = g.monto ?? 0;
    total += monto;
    if (g.estado === 'pagado') pagado += monto;

    const m = mesMap.get(g.periodo) ?? { total: 0, pagado: 0 };
    m.total += monto;
    if (g.estado === 'pagado') m.pagado += monto;
    mesMap.set(g.periodo, m);

    const serv = g.servicios?.nombre;
    if (serv) servMap.set(serv, (servMap.get(serv) ?? 0) + monto);

    const area = g.servicios?.planillas?.nombre;
    if (area) areaMap.set(area, (areaMap.get(area) ?? 0) + monto);
  }

  return {
    desde,
    hasta,
    alcance: alcance === 'todo' ? 'Todas las planillas' : (alcanceNombre ?? 'la planilla seleccionada'),
    total,
    pagado,
    meses: [...mesMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodo, v]) => ({ periodo, ...v })),
    servicios: [...servMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([nombre, total]) => ({ nombre, total })),
    areas: [...areaMap.entries()].map(([area, total]) => ({ area, total })),
  };
}

/** Demo: redacta un informe plausible a partir de los agregados, sin backend. */
function simular(d: DatosInforme): string {
  const pct = d.total > 0 ? Math.round((d.pagado / d.total) * 100) : 0;
  const primero = d.meses[0];
  const ultimo = d.meses[d.meses.length - 1];
  const variacion =
    primero && ultimo && primero.total > 0
      ? Math.round(((ultimo.total - primero.total) / primero.total) * 100)
      : 0;
  const tendencia =
    variacion > 3 ? 'en aumento' : variacion < -3 ? 'a la baja' : 'estable';
  const top = d.servicios[0];
  const top2 = d.servicios[1];

  return [
    'Resumen',
    `En el período de ${formatearPeriodo(d.desde)} a ${formatearPeriodo(d.hasta)} (${d.alcance.toLowerCase()}) ` +
      `gastaste ${formatearMonto(d.total)} en total, de los cuales pagaste ${formatearMonto(d.pagado)} (${pct}%).`,
    '',
    'Evolución',
    `El gasto mensual se mantuvo ${tendencia}` +
      (primero && ultimo && primero.periodo !== ultimo.periodo
        ? `, pasando de ${formatearMonto(primero.total)} en ${formatearPeriodo(primero.periodo)} a ` +
          `${formatearMonto(ultimo.total)} en ${formatearPeriodo(ultimo.periodo)}.`
        : '.'),
    '',
    'Observaciones',
    top ? `El servicio de mayor peso fue ${top.nombre} (${formatearMonto(top.total)}).` : '',
    top2 ? `Le sigue ${top2.nombre} (${formatearMonto(top2.total)}); conviene revisar si hay margen de ahorro.` : '',
    pct < 100
      ? `Quedó ${formatearMonto(d.total - d.pagado)} sin pagar: programá esos vencimientos para evitar recargos.`
      : 'Tenés todo al día: buen trabajo manteniendo los pagos en fecha.',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function generarInforme(datos: DatosInforme): Promise<string> {
  if (!SUPABASE_CONFIGURADO) {
    await new Promise((r) => setTimeout(r, 1400)); // emula la latencia del modelo
    return simular(datos);
  }

  const res = await fetch('/api/informe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? 'No se pudo generar el informe.');
  }
  return data.informe as string;
}
