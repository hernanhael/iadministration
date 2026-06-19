'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { mensajeError } from '@/lib/errores';
import { SUPABASE_CONFIGURADO, DEMO_GASTOS, ERROR_PREVIEW } from '@/lib/preview';
import type { Carga, EstadoGasto, GastoConServicio } from '@/types/modelos';

const SELECT =
  '*, servicios(nombre, empresa, nro_cliente, url_pago, color, planilla_id, acumulable, planillas(nombre, detalle, color, tipo))';

export interface GastoInput {
  servicio_id: string;
  periodo: string;
  monto: number | null;
  vencimiento: string | null;
  fecha_pago: string | null;
  observacion: string | null;
  /** Cargas de un servicio acumulable. Para gastos normales queda vacío. */
  cargas?: Carga[];
}

/** Deriva el estado almacenado a partir de si hay fecha de pago. */
function estadoDesdePago(fecha_pago: string | null): EstadoGasto {
  return fecha_pago ? 'pagado' : 'pendiente';
}

export function useGastos() {
  const supabase = useMemo(() => (SUPABASE_CONFIGURADO ? createClient() : null), []);
  const [gastos, setGastos] = useState<GastoConServicio[]>(
    SUPABASE_CONFIGURADO ? [] : DEMO_GASTOS,
  );
  const [cargando, setCargando] = useState(SUPABASE_CONFIGURADO);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!supabase) return; // modo vista previa
    const { data, error } = await supabase
      .from('gastos')
      .select(SELECT)
      .order('periodo', { ascending: false })
      .order('vencimiento', { ascending: true, nullsFirst: false });
    if (error) setError(mensajeError(error));
    else {
      setGastos((data ?? []) as unknown as GastoConServicio[]);
      setError(null);
    }
    setCargando(false);
  }, [supabase]);

  useEffect(() => {
    // Los setState de recargar() ocurren después del await (no son síncronos),
    // por lo que no provocan el render en cascada que advierte la regla.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recargar();
  }, [recargar]);

  const duplicado = 'Ya cargaste un gasto para ese servicio en ese período. Editalo desde el historial.';

  const crear = useCallback(
    async (input: GastoInput) => {
      if (!supabase) throw new Error(ERROR_PREVIEW);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user_id = session?.user.id;
      if (!user_id) throw new Error('No hay sesión activa.');
      const { error } = await supabase.from('gastos').insert({
        ...input,
        cargas: input.cargas ?? [],
        user_id,
        estado: estadoDesdePago(input.fecha_pago),
        monto_confirmado: true, // carga manual: el monto es el real
      });
      if (error) throw new Error(mensajeError(error, { duplicado }));
      await recargar();
    },
    [supabase, recargar],
  );

  const actualizar = useCallback(
    async (id: string, input: GastoInput) => {
      if (!supabase) throw new Error(ERROR_PREVIEW);
      const { error } = await supabase
        .from('gastos')
        .update({
          ...input,
          cargas: input.cargas ?? [],
          estado: estadoDesdePago(input.fecha_pago),
          monto_confirmado: true,
        })
        .eq('id', id);
      if (error) throw new Error(mensajeError(error, { duplicado }));
      await recargar();
    },
    [supabase, recargar],
  );

  const eliminar = useCallback(
    async (id: string) => {
      if (!supabase) throw new Error(ERROR_PREVIEW);
      const { error } = await supabase.from('gastos').delete().eq('id', id);
      if (error) throw new Error(mensajeError(error));
      await recargar();
    },
    [supabase, recargar],
  );

  // Recurrencia (Fase 3): genera en el servidor los gastos faltantes del período
  // (idempotente por unique servicio_id+periodo) y recarga. En modo vista previa
  // no hace nada: ahí el "reinicio mensual" se simula en el cliente.
  const generarPeriodo = useCallback(
    async (periodo: string) => {
      if (!supabase) return; // modo vista previa
      const { error } = await supabase.rpc('generar_gastos_periodo', { p_periodo: periodo });
      if (error) {
        setError(mensajeError(error));
        return;
      }
      await recargar();
    },
    [supabase, recargar],
  );

  return { gastos, cargando, error, recargar, crear, actualizar, eliminar, generarPeriodo };
}
