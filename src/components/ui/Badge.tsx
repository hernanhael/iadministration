import type { EstadoVisual } from '@/types/modelos';

const estadoEstilo: Record<EstadoVisual, string> = {
  pendiente: 'bg-warning/10 text-warning border-warning/30',
  pagado: 'bg-brand/10 text-brand border-brand/30',
  vencido: 'bg-danger/10 text-danger border-danger/30',
};

const estadoTexto: Record<EstadoVisual, string> = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  vencido: 'Vencido',
};

export function BadgeEstado({ estado }: { estado: EstadoVisual }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${estadoEstilo[estado]}`}>
      {estadoTexto[estado]}
    </span>
  );
}

/** Pill con el nombre de la categoría sobre su color (estilo dashboard). */
export function BadgeCategoria({ nombre, color }: { nombre: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold text-[#1b1b1d]"
      style={{ backgroundColor: color }}
    >
      {nombre}
    </span>
  );
}

/** Punto de color de una categoría, para listas y leyendas. */
export function PuntoColor({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-3 w-3 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}
