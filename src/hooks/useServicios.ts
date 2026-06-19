'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { mensajeError } from '@/lib/errores';
import { SUPABASE_CONFIGURADO, DEMO_SERVICIOS, ERROR_PREVIEW } from '@/lib/preview';
import { porNombre } from '@/lib/formateo';
import type { ServicioConPlanilla } from '@/types/modelos';

const SELECT = '*, planillas(nombre, detalle, color, tipo)';

export interface ServicioInput {
  planilla_id: string;
  nombre: string;
  empresa: string | null;
  nro_cliente: string | null;
  url_pago: string | null;
  dia_vencimiento: number | null;
  color: string;
  activo: boolean;
  /** Permite cargar varias veces en el mes (ej. nafta): el gasto suma las cargas. */
  acumulable: boolean;
}

export function useServicios({ soloActivos = false }: { soloActivos?: boolean } = {}) {
  const supabase = useMemo(() => (SUPABASE_CONFIGURADO ? createClient() : null), []);
  const [servicios, setServicios] = useState<ServicioConPlanilla[]>(
    SUPABASE_CONFIGURADO ? [] : DEMO_SERVICIOS.filter((s) => !soloActivos || s.activo).sort(porNombre),
  );
  const [cargando, setCargando] = useState(SUPABASE_CONFIGURADO);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!supabase) return; // modo vista previa
    let query = supabase.from('servicios').select(SELECT).order('nombre', { ascending: true });
    if (soloActivos) query = query.eq('activo', true);
    const { data, error } = await query;
    if (error) setError(mensajeError(error));
    else {
      setServicios((data ?? []) as unknown as ServicioConPlanilla[]);
      setError(null);
    }
    setCargando(false);
  }, [supabase, soloActivos]);

  useEffect(() => {
    // Los setState de recargar() ocurren después del await (no son síncronos),
    // por lo que no provocan el render en cascada que advierte la regla.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recargar();
  }, [recargar]);

  const crear = useCallback(
    async (input: ServicioInput) => {
      if (!supabase) throw new Error(ERROR_PREVIEW);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user_id = session?.user.id;
      if (!user_id) throw new Error('No hay sesión activa.');
      const { error } = await supabase.from('servicios').insert({ ...input, user_id });
      if (error) throw new Error(mensajeError(error));
      await recargar();
    },
    [supabase, recargar],
  );

  const actualizar = useCallback(
    async (id: string, cambios: Partial<ServicioInput>) => {
      if (!supabase) throw new Error(ERROR_PREVIEW);
      const { error } = await supabase.from('servicios').update(cambios).eq('id', id);
      if (error) throw new Error(mensajeError(error));
      await recargar();
    },
    [supabase, recargar],
  );

  // Borrado lógico si el servicio tiene gastos (preserva el historial);
  // borrado físico solo si no tiene ninguno. Devuelve cuál ocurrió.
  const eliminar = useCallback(
    async (id: string): Promise<'logico' | 'fisico'> => {
      if (!supabase) throw new Error(ERROR_PREVIEW);
      const { count, error: errCount } = await supabase
        .from('gastos')
        .select('id', { count: 'exact', head: true })
        .eq('servicio_id', id);
      if (errCount) throw new Error(mensajeError(errCount));

      if ((count ?? 0) > 0) {
        const { error } = await supabase.from('servicios').update({ activo: false }).eq('id', id);
        if (error) throw new Error(mensajeError(error));
        await recargar();
        return 'logico';
      }

      const { error } = await supabase.from('servicios').delete().eq('id', id);
      if (error) throw new Error(mensajeError(error));
      await recargar();
      return 'fisico';
    },
    [supabase, recargar],
  );

  return { servicios, cargando, error, recargar, crear, actualizar, eliminar };
}
