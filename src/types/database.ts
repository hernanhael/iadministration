// Tipos de la base de datos.
// Esta es una versión escrita a mano para que el proyecto compile antes de
// conectar Supabase. Una vez linkeado el proyecto, regeneralos con:
//   supabase gen types typescript --linked > src/types/database.ts

export type EstadoGasto = 'pendiente' | 'pagado';

/** Una carga puntual de un servicio acumulable (ej. una carga de nafta). */
export interface Carga {
  monto: number;
  fecha: string; // 'YYYY-MM-DD' — fecha en que se hizo (y se pagó) la carga
}

export interface Database {
  public: {
    Tables: {
      planillas: {
        Row: {
          id: string;
          user_id: string;
          nombre: string;
          detalle: string | null;
          color: string;
          tipo: 'egreso' | 'ingreso';
          activo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          nombre: string;
          detalle?: string | null;
          color?: string;
          tipo?: 'egreso' | 'ingreso';
          activo?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['planillas']['Insert']>;
        Relationships: [];
      };
      servicios: {
        Row: {
          id: string;
          user_id: string;
          planilla_id: string;
          nombre: string;
          empresa: string | null;
          nro_cliente: string | null;
          url_pago: string | null;
          dia_vencimiento: number | null;
          color: string;
          activo: boolean;
          acumulable: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          planilla_id: string;
          nombre: string;
          empresa?: string | null;
          nro_cliente?: string | null;
          url_pago?: string | null;
          dia_vencimiento?: number | null;
          color?: string;
          activo?: boolean;
          acumulable?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['servicios']['Insert']>;
        Relationships: [];
      };
      gastos: {
        Row: {
          id: string;
          user_id: string;
          servicio_id: string;
          periodo: string;
          monto: number | null;
          vencimiento: string | null;
          fecha_pago: string | null;
          estado: EstadoGasto;
          monto_confirmado: boolean;
          observacion: string | null;
          // Cargas individuales para servicios acumulables (ej. nafta). Para los
          // servicios normales queda como arreglo vacío.
          cargas: Carga[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          servicio_id: string;
          periodo: string;
          monto?: number | null;
          vencimiento?: string | null;
          fecha_pago?: string | null;
          estado?: EstadoGasto;
          monto_confirmado?: boolean;
          observacion?: string | null;
          cargas?: Carga[];
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['gastos']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      generar_gastos_periodo: {
        Args: { p_periodo: string };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
