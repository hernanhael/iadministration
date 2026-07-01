// Formateo de moneda (ARS), fechas y períodos en español.
import type { Carga } from '@/types/database';
import type { GastoConServicio } from '@/types/modelos';

/** Suma de los montos de una lista de cargas (servicio acumulable). */
export function sumarCargas(cargas: Carga[] | null | undefined): number {
  return (cargas ?? []).reduce((s, c) => s + (c.monto ?? 0), 0);
}

/** Un gasto "tuvo movimiento" si ya se cargó de verdad: monto confirmado o,
 *  si es acumulable, al menos una carga. Una fila "reiniciada" sin cargar
 *  todavía no cuenta — no debe aparecer en el Histórico. */
export function tuvoMovimiento(g: GastoConServicio): boolean {
  return g.servicios?.acumulable ? (g.cargas?.length ?? 0) > 0 : g.monto != null;
}

/** Fecha de la última carga (la más reciente), o null si no hay cargas. */
export function ultimaFechaCarga(cargas: Carga[] | null | undefined): string | null {
  if (!cargas || cargas.length === 0) return null;
  return cargas.reduce((max, c) => (c.fecha > max ? c.fecha : max), cargas[0].fecha);
}

/** Comparador alfabético en español (case/acentos-insensible) por la propiedad `nombre`. */
export function porNombre(a: { nombre: string }, b: { nombre: string }): number {
  return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
}

const monedaARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
});

export function formatearMonto(monto: number | null | undefined): string {
  if (monto === null || monto === undefined) return '—';
  return monedaARS.format(monto);
}

/** Fecha 'YYYY-MM-DD' o Date → 'DD/MM/YYYY'. */
export function formatearFecha(fecha: string | Date | null | undefined): string {
  if (!fecha) return '—';
  const d = typeof fecha === 'string' ? new Date(`${fecha}T00:00:00`) : fecha;
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/** Fecha 'YYYY-MM-DD' o Date → 'DD/MM' (sin año, para tablas compactas). */
export function formatearFechaCorta(fecha: string | Date | null | undefined): string {
  if (!fecha) return '—';
  const d = typeof fecha === 'string' ? new Date(`${fecha}T00:00:00`) : fecha;
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' }).format(d);
}

/** A partir de 'YYYY-MM' y un día, arma 'YYYY-MM-DD' acotando al último día del mes. */
export function vencimientoDelPeriodo(periodo: string, dia: number | null): string | null {
  if (!dia || !/^\d{4}-\d{2}$/.test(periodo)) return null;
  const [y, m] = periodo.split('-').map(Number);
  const ultimoDia = new Date(y, m, 0).getDate();
  const d = Math.min(dia, ultimoDia);
  return `${periodo}-${String(d).padStart(2, '0')}`;
}

/** Suma (o resta, con n negativo) meses a un período 'YYYY-MM'. */
export function sumarMeses(periodo: string, n: number): string {
  const [y, m] = periodo.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Período actual en formato 'YYYY-MM'. */
export function periodoActual(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** '2026-06' → 'junio 2026'. */
export function formatearPeriodo(periodo: string): string {
  const [year, month] = periodo.split('-').map(Number);
  if (!year || !month) return periodo;
  const fecha = new Date(year, month - 1, 1);
  const txt = new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
  }).format(fecha);
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

/** "Vencido" es estado derivado: pendiente y vencimiento anterior a hoy. */
export function estaVencido(
  estado: 'pendiente' | 'pagado',
  vencimiento: string | null | undefined,
): boolean {
  if (estado !== 'pendiente' || !vencimiento) return false;
  const venc = new Date(`${vencimiento}T00:00:00`);
  const ahora = new Date();
  ahora.setHours(0, 0, 0, 0);
  return venc < ahora;
}
