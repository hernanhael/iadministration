'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { mensajeError } from '@/lib/errores';
import { SUPABASE_CONFIGURADO, DEMO_PLANILLAS, ERROR_PREVIEW } from '@/lib/preview';
import { periodoActual, porNombre } from '@/lib/formateo';
import type { Planilla } from '@/types/modelos';

export interface PlanillaInput {
  nombre: string;
  detalle: string | null;
  color: string;
  tipo?: 'egreso' | 'ingreso';
}

export function usePlanillas({ incluirInactivas = false }: { incluirInactivas?: boolean } = {}) {
  const supabase = useMemo(() => (SUPABASE_CONFIGURADO ? createClient() : null), []);
  const [planillas, setPlanillas] = useState<Planilla[]>(
    SUPABASE_CONFIGURADO ? [] : [...DEMO_PLANILLAS].sort(porNombre),
  );
  const [cargando, setCargando] = useState(SUPABASE_CONFIGURADO);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!supabase) return; // modo vista previa
    let query = supabase.from('planillas').select('*').order('nombre', { ascending: true });
    if (!incluirInactivas) query = query.eq('activo', true);
    const { data, error } = await query;
    if (error) setError(mensajeError(error));
    else {
      setPlanillas(data ?? []);
      setError(null);
    }
    setCargando(false);
  }, [supabase, incluirInactivas]);

  useEffect(() => {
    // Los setState de recargar() ocurren después del await (no son síncronos),
    // por lo que no provocan el render en cascada que advierte la regla.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recargar();
  }, [recargar]);

  const crear = useCallback(
    async (input: PlanillaInput) => {
      if (!supabase) throw new Error(ERROR_PREVIEW);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user_id = session?.user.id;
      if (!user_id) throw new Error('No hay sesión activa.');
      const { error } = await supabase.from('planillas').insert({ ...input, user_id });
      if (error)
        throw new Error(
          mensajeError(error, { duplicado: 'Ya existe una planilla con ese nombre.' }),
        );
      await recargar();
    },
    [supabase, recargar],
  );

  const actualizar = useCallback(
    async (id: string, cambios: Partial<PlanillaInput>) => {
      if (!supabase) throw new Error(ERROR_PREVIEW);
      const { error } = await supabase.from('planillas').update(cambios).eq('id', id);
      if (error)
        throw new Error(
          mensajeError(error, { duplicado: 'Ya existe una planilla con ese nombre.' }),
        );
      await recargar();
    },
    [supabase, recargar],
  );

  // Borrado lógico: desactiva la planilla y todos sus servicios, y elimina los
  // gastos no confirmados del mes actual. El historial de meses anteriores se conserva.
  const eliminar = useCallback(
    async (id: string) => {
      if (!supabase) throw new Error(ERROR_PREVIEW);
      const actual = periodoActual();

      // Obtener los IDs de los servicios de esta planilla
      const { data: srvs } = await supabase
        .from('servicios')
        .select('id')
        .eq('planilla_id', id);

      if (srvs?.length) {
        // Borrar gastos no confirmados del mes actual para esos servicios
        await supabase
          .from('gastos')
          .delete()
          .in('servicio_id', srvs.map((s) => s.id))
          .eq('periodo', actual)
          .eq('monto_confirmado', false);

        // Desactivar todos los servicios
        await supabase.from('servicios').update({ activo: false }).eq('planilla_id', id);
      }

      // Desactivar la planilla
      const { error } = await supabase.from('planillas').update({ activo: false }).eq('id', id);
      if (error) throw new Error(mensajeError(error));

      await recargar();
    },
    [supabase, recargar],
  );

  return { planillas, cargando, error, recargar, crear, actualizar, eliminar };
}
