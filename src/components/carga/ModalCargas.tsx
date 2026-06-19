'use client';

import { useState } from 'react';
import type { Carga } from '@/types/modelos';
import { formatearFecha, formatearMonto, sumarCargas } from '@/lib/formateo';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { FormMessage } from '@/components/ui/FormMessage';
import { IconBasura, IconMas } from '@/components/ui/icons';

interface Props {
  abierto: boolean;
  servicioNombre: string;
  cargasIniciales: Carga[];
  /** Carga sugerida (ej. leída por OCR) para precargar el formulario de alta. */
  draftInicial?: Carga | null;
  onCerrar: () => void;
  onGuardar: (cargas: Carga[]) => Promise<void>;
}

const hoy = () => new Date().toISOString().slice(0, 10);

/** Gestiona las cargas del mes de un servicio acumulable (ej. nafta). */
export function ModalCargas({
  abierto,
  servicioNombre,
  cargasIniciales,
  draftInicial,
  onCerrar,
  onGuardar,
}: Props) {
  const ordenar = (cs: Carga[]) => [...cs].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const [cargas, setCargas] = useState<Carga[]>(ordenar(cargasIniciales));
  const [monto, setMonto] = useState(draftInicial?.monto != null ? String(draftInicial.monto) : '');
  const [fecha, setFecha] = useState(draftInicial?.fecha ?? hoy());
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function agregar() {
    setError(null);
    const montoNum = Number(monto);
    if (monto.trim() === '' || Number.isNaN(montoNum) || montoNum <= 0)
      return setError('Poné un monto válido para la carga.');
    if (!fecha) return setError('Indicá la fecha de la carga.');
    setCargas((cs) => ordenar([...cs, { monto: montoNum, fecha }]));
    setMonto('');
    setFecha(hoy());
  }

  function quitar(i: number) {
    setCargas((cs) => cs.filter((_, idx) => idx !== i));
  }

  async function guardar() {
    setError(null);
    setGuardando(true);
    try {
      await onGuardar(cargas);
      onCerrar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={`Cargas del mes — ${servicioNombre}`}>
      <div className="flex flex-col gap-4">
        {error && <FormMessage tipo="error">{error}</FormMessage>}

        {/* Lista de cargas */}
        {cargas.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted">
            Todavía no hay cargas este mes. Agregá la primera abajo.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {cargas.map((c, i) => (
              <li
                key={`${c.fecha}-${i}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2"
              >
                <span className="text-sm text-muted">{formatearFecha(c.fecha)}</span>
                <span className="tabular flex-1 text-right text-sm font-semibold">
                  {formatearMonto(c.monto)}
                </span>
                <button
                  type="button"
                  aria-label="Quitar carga"
                  title="Quitar carga"
                  onClick={() => quitar(i)}
                  className="rounded-lg p-1 text-muted transition-colors hover:text-danger"
                >
                  <IconBasura size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Total del mes */}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">Total del mes</span>
          <span className="tabular text-base font-extrabold">{formatearMonto(sumarCargas(cargas))}</span>
        </div>

        {/* Alta de una carga nueva */}
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-border p-3">
          <div>
            <Label htmlFor="cargaMonto">Monto (ARS)</Label>
            <Input
              id="cargaMonto"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="cargaFecha">Fecha</Label>
            <Input
              id="cargaFecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <Button type="button" variante="secondary" onClick={agregar} className="w-full">
              <IconMas size={16} /> Agregar carga
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variante="ghost" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="button" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
