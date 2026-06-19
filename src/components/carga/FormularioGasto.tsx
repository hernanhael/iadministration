'use client';

import { useState } from 'react';
import type { GastoInput } from '@/hooks/useGastos';
import type { GastoConServicio, ServicioConPlanilla } from '@/types/modelos';
import { periodoActual, vencimientoDelPeriodo } from '@/lib/formateo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { SelectorOpciones } from '@/components/ui/SelectorOpciones';
import { Textarea } from '@/components/ui/Textarea';
import { FormMessage } from '@/components/ui/FormMessage';

interface Props {
  servicios: ServicioConPlanilla[];
  gastoInicial?: GastoConServicio | null;
  onGuardar: (input: GastoInput) => Promise<void>;
  onExito?: () => void;
  onCancelar?: () => void;
  textoGuardar?: string;
}

export function FormularioGasto({
  servicios,
  gastoInicial,
  onGuardar,
  onExito,
  onCancelar,
  textoGuardar = 'Guardar gasto',
}: Props) {
  const [servicioId, setServicioId] = useState(gastoInicial?.servicio_id ?? '');
  const [periodo, setPeriodo] = useState(gastoInicial?.periodo ?? periodoActual());
  const [monto, setMonto] = useState(gastoInicial?.monto != null ? String(gastoInicial.monto) : '');
  const [vencimiento, setVencimiento] = useState(gastoInicial?.vencimiento ?? '');
  const [fechaPago, setFechaPago] = useState(gastoInicial?.fecha_pago ?? '');
  const [observacion, setObservacion] = useState(gastoInicial?.observacion ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function alElegirServicio(id: string) {
    setServicioId(id);
    // Sugerir vencimiento según el día del servicio, si el campo está vacío.
    if (!vencimiento) {
      const serv = servicios.find((s) => s.id === id);
      const sugerido = vencimientoDelPeriodo(periodo, serv?.dia_vencimiento ?? null);
      if (sugerido) setVencimiento(sugerido);
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!servicioId) return setError('Elegí un servicio.');
    if (!/^\d{4}-\d{2}$/.test(periodo)) return setError('Indicá un período válido.');

    const montoNum = monto.trim() === '' ? null : Number(monto);
    if (montoNum !== null && (Number.isNaN(montoNum) || montoNum < 0))
      return setError('El monto no es válido.');

    setGuardando(true);
    try {
      await onGuardar({
        servicio_id: servicioId,
        periodo,
        monto: montoNum,
        vencimiento: vencimiento || null,
        fecha_pago: fechaPago || null,
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
        <Label htmlFor="servicio">Servicio</Label>
        <SelectorOpciones
          id="servicio"
          value={servicioId}
          onChange={alElegirServicio}
          placeholder="Elegí un servicio…"
          opciones={servicios.map((s) => ({
            value: s.id,
            label: s.empresa ? `${s.nombre} — ${s.empresa}` : s.nombre,
          }))}
        />
        {servicios.length === 0 && (
          <p className="mt-1 text-xs text-warning">
            No tenés servicios activos. Creá uno con el botón “Nuevo servicio”.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="periodo">Período</Label>
          <Input
            id="periodo"
            type="month"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="monto">Monto (ARS)</Label>
          <Input
            id="monto"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="vencimiento">Vencimiento</Label>
          <Input
            id="vencimiento"
            type="date"
            value={vencimiento}
            onChange={(e) => setVencimiento(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="fechaPago">Fecha de pago</Label>
          <Input
            id="fechaPago"
            type="date"
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
        <Button type="submit" disabled={guardando || servicios.length === 0}>
          {guardando ? 'Guardando…' : textoGuardar}
        </Button>
      </div>
    </form>
  );
}
