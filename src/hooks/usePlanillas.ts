'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { mensajeError } from '@/lib/errores';
import { SUPABASE_CONFIGURADO, DEMO_PLANILLAS, ERROR_PREVIEW } from '@/lib/preview';
import { porNombre } from '@/lib/formateo';
import type { Planilla } from '@/types/modelos';

export interface PlanillaInput {
  nombre: string;
  detalle: string | null;
  color: string;
  tipo?: 'egreso' | 'ingreso';
}

export function usePlanillas() {
  const supabase = useMemo(() => (SUPABASE_CONFIGURADO ? createClient() : null), []);
  const [planillas, setPlanillas] = useState<Planilla[]>(
    SUPABASE_CONFIGURADO ? [] : [...DEMO_PLANILLAS].sort(porNombre),
  );
  const [cargando, setCargando] = useState(SUPABASE_CONFIGURADO);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!supabase) return; // modo vista previa
    const { data, error } = await supabase
      .from('planillas')
      .select('*')
      .order('nombre', { ascending: true });
    if (error) setError(mensajeError(error));
    else {
      setPlanillas(data ?? []);
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

  const eliminar = useCallback(
    async (id: string) => {
      if (!supabase) throw new Error(ERROR_PREVIEW);
      const { error } = await supabase.from('planillas').delete().eq('id', id);
      if (error)
        throw new Error(
          mensajeError(error, {
            relacion: 'No se puede borrar: tiene servicios asociados. Eliminá o reasigná esos servicios primero.',
          }),
        );
      await recargar();
    },
    [supabase, recargar],
  );

  return { planillas, cargando, error, recargar, crear, actualizar, eliminar };
}
