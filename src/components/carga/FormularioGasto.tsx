'use client';

import { useState } from 'react';
import type { GastoInput } from '@/hooks/useGastos';
import type { GastoConServicio } from '@/types/modelos';
import { periodoActual } from '@/lib/formateo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { FormMessage } from '@/components/ui/FormMessage';

// Convierte YYYY-MM-DD → DD/MM/AAAA para mostrar en el campo.
function isoADisplay(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Convierte DD/MM/AAAA → YYYY-MM-DD para guardar. Devuelve null si no es válida.
function displayAIso(display: string): string | null {
  const m = display.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

interface Props {
  gastoInicial?: GastoConServicio | null;
  onGuardar: (input: GastoInput) => Promise<void>;
  onExito?: () => void;
  onCancelar?: () => void;
}

export function FormularioGasto({ gastoInicial, onGuardar, onExito, onCancelar }: Props) {
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="vencimiento">Vencimiento</Label>
          <Input
            id="vencimiento"
            type="text"
            inputMode="numeric"
            placeholder="dd/mm/aaaa"
            value={vencimiento}
            onChange={(e) => setVencimiento(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="fechaPago">Fecha de pago</Label>
          <Input
            id="fechaPago"
            type="text"
            inputMode="numeric"
            placeholder="dd/mm/aaaa"
            value={fechaPago}
            onChange={(e) => setFechaPago(e.target.value)}
          />
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
