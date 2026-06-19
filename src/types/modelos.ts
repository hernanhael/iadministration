// Alias y tipos compuestos derivados de la base de datos, para uso cómodo en la app.
import type { Carga, Database, EstadoGasto } from './database';

export type { Carga, EstadoGasto };

export type Planilla = Database['public']['Tables']['planillas']['Row'];
export type Servicio = Database['public']['Tables']['servicios']['Row'];
export type Gasto = Database['public']['Tables']['gastos']['Row'];

export type PlanillaInsert = Database['public']['Tables']['planillas']['Insert'];
export type ServicioInsert = Database['public']['Tables']['servicios']['Insert'];
export type GastoInsert = Database['public']['Tables']['gastos']['Insert'];

/** Resumen de planilla que viaja embebido en consultas con join. */
export type PlanillaResumen = Pick<Planilla, 'nombre' | 'detalle' | 'color' | 'tipo'>;

/** Servicio con su planilla embebida (para tablas y selectores). */
export type ServicioConPlanilla = Servicio & {
  planillas: PlanillaResumen | null;
};

/** Datos del servicio que viajan embebidos en cada gasto. */
export type ServicioResumen = Pick<
  Servicio,
  'nombre' | 'empresa' | 'nro_cliente' | 'url_pago' | 'color' | 'planilla_id' | 'acumulable'
> & {
  planillas: PlanillaResumen | null;
};

/** Gasto con su servicio y la planilla de ese servicio (para el dashboard). */
export type GastoConServicio = Gasto & {
  servicios: ServicioResumen | null;
};

/** Estado para mostrar en UI: el "vencido" derivado se suma a los almacenados. */
export type EstadoVisual = EstadoGasto | 'vencido';
