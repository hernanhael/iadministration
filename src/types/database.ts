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
          // Dirección de correo del proveedor: el cron de facturas por email
          // (src/app/api/cron/facturas-gmail) busca mensajes de esta dirección
          // para precargar monto/vencimiento automáticamente.
          email_remitente: string | null;
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
          email_remitente?: string | null;
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
      // Registro de mensajes de Gmail ya procesados por el cron de facturas,
      // para no reprocesarlos (ni volver a cobrar la llamada a la IA) en cada
      // corrida diaria. Solo se accede vía service role (sin RLS policies).
      emails_procesados: {
        Row: {
          id: string;
          gmail_message_id: string;
          servicio_id: string | null;
          procesado_en: string;
        };
        Insert: {
          id?: string;
          gmail_message_id: string;
          servicio_id?: string | null;
          procesado_en?: string;
        };
        Update: Partial<Database['public']['Tables']['emails_procesados']['Insert']>;
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
