'use client';

import { useState } from 'react';
import type { GastoInput } from '@/hooks/useGastos';
import type { GastoConServicio } from '@/types/modelos';
import { displayAIso, isoADisplay, periodoActual } from '@/lib/formateo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { SelectorFecha } from '@/components/ui/SelectorFecha';
import { Textarea } from '@/components/ui/Textarea';
import { FormMessage } from '@/components/ui/FormMessage';

interface Props {
  gastoInicial?: GastoConServicio | null;
  /** Planilla de ingreso: sin campo Vencimiento (un ingreso no vence). */
  esIngreso?: boolean;
  onGuardar: (input: GastoInput) => Promise<void>;
  onExito?: () => void;
  onCancelar?: () => void;
}

export function FormularioGasto({ gastoInicial, esIngreso = false, onGuardar, onExito, onCancelar }: Props) {
  const servicioId = gastoInicial?.servicio_id ?? '';
  const periodo = gastoInicial?.periodo ?? periodoActual();

  const [monto, setMonto] = useState(gastoInicial?.monto != null ? String(gastoInicial.monto) : '');
  const [vencimiento, setVencimiento] = useState(isoADisplay(gastoInicial?.vencimiento ?? ''));
  const [fechaPago, setFechaPago] = useState(isoADisplay(gastoInicial?.fecha_pago ?? ''));
  const [observacion, setObservacion] = useState(gastoInicial?.observacion ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const montoNum = monto.trim() === '' ? null : Number(monto.replace(',', '.'));
    if (montoNum !== null && (Number.isNaN(montoNum) || montoNum < 0))
      return setError('El monto no es válido.');

    const vencIso = vencimiento ? displayAIso(vencimiento) : null;
    if (vencimiento && !vencIso)
      return setError('La fecha de vencimiento debe tener el formato dd/mm/aaaa.');

    const pagoIso = fechaPago ? displayAIso(fechaPago) : null;
    if (fechaPago && !pagoIso)
      return setError('La fecha de pago debe tener el formato dd/mm/aaaa.');

    setGuardando(true);
    try {
      await onGuardar({
        servicio_id: servicioId,
        periodo,
        monto: montoNum,
        vencimiento: vencIso,
        fecha_pago: pagoIso,
        observacion: observacion.trim() || null,
      });
      onExito?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      {error && <FormMessage tipo="error">{error}</FormMessage>}

      <div>
        <Label htmlFor="monto">Monto (ARS)</Label>
        <Input
          id="monto"
          type="text"
          inputMode="decimal"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="0.00"
        />
      </div>

      <div className={esIngreso ? '' : 'grid grid-cols-2 gap-3'}>
        {!esIngreso && (
          <div>
            <Label htmlFor="vencimiento">Vencimiento</Label>
            <SelectorFecha id="vencimiento" value={vencimiento} onChange={setVencimiento} />
          </div>
        )}
        <div>
          <Label htmlFor="fechaPago">Fecha de pago</Label>
          <SelectorFecha id="fechaPago" value={fechaPago} onChange={setFechaPago} />
          <p className="mt-1 text-xs text-muted">Si la cargás, queda como pagado.</p>
        </div>
      </div>

      <div>
        <Label htmlFor="observacion">Observación</Label>
        <Textarea
          id="observacion"
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          placeholder="Notas opcionales…"
        />
      </div>

      <div className="flex justify-end gap-2">
        {onCancelar && (
          <Button type="button" variante="secondary" onClick={onCancelar} disabled={guardando}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}
