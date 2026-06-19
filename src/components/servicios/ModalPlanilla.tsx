'use client';

import { useState } from 'react';
import type { PlanillaInput } from '@/hooks/usePlanillas';
import type { Planilla } from '@/types/modelos';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { FormMessage } from '@/components/ui/FormMessage';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  planillaInicial?: Planilla | null;
  /** Tipo predeterminado al crear una planilla nueva (default: 'egreso'). */
  tipoInicial?: 'egreso' | 'ingreso';
  onGuardar: (input: PlanillaInput) => Promise<void>;
}

export function ModalPlanilla({ abierto, onCerrar, planillaInicial, tipoInicial = 'egreso', onGuardar }: Props) {
  const editando = Boolean(planillaInicial);
  const [nombre, setNombre] = useState(planillaInicial?.nombre ?? '');
  const [detalle, setDetalle] = useState(planillaInicial?.detalle ?? '');
  const [color, setColor] = useState(planillaInicial?.color ?? '#5F5E5A');
  const [tipo, setTipo] = useState<'egreso' | 'ingreso'>(planillaInicial?.tipo ?? tipoInicial);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) return setError('Poné un nombre a la planilla.');

    setGuardando(true);
    try {
      await onGuardar({ nombre: nombre.trim(), detalle: detalle.trim() || null, color, tipo });
      onCerrar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={editando ? 'Editar planilla' : 'Nueva planilla'}>
      <form onSubmit={enviar} className="flex flex-col gap-4">
        {error && <FormMessage tipo="error">{error}</FormMessage>}

        {/* Tipo: Egresos / Ingresos */}
        <div>
          <Label>Tipo</Label>
          <div className="mt-1 flex rounded-xl border border-border bg-surface p-1 w-fit">
            {(['egreso', 'ingreso'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
                  tipo === t
                    ? 'bg-surface-2 text-foreground shadow-sm'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {t === 'egreso' ? 'Egresos' : 'Ingresos'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="plnombre">Nombre</Label>
          <Input id="plnombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Auto" required />
        </div>

        <div>
          <Label htmlFor="pldetalle">Detalle (opcional)</Label>
          <Input
            id="pldetalle"
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder="Clío Mío / Ituzaingó 1247"
          />
        </div>

        <div>
          <Label htmlFor="plcolor">Color</Label>
          <div className="flex items-center gap-2">
            <input
              id="plcolor"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-11 w-12 cursor-pointer rounded-lg border border-border bg-surface"
            />
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="tabular uppercase"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variante="secondary" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
