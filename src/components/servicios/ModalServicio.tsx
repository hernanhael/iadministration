'use client';

import { useState } from 'react';
import type { ServicioInput } from '@/hooks/useServicios';
import type { ServicioConPlanilla } from '@/types/modelos';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { FormMessage } from '@/components/ui/FormMessage';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  servicioInicial?: ServicioConPlanilla | null;
  /** Planilla a la que pertenece el servicio (se pasa siempre desde el contexto). */
  planillaIdInicial?: string;
  /** Planilla de ingreso: se llama "concepto" y no tiene proveedor, N° de cliente
   *  ni link de pago (no aplican a un ingreso). */
  esIngreso?: boolean;
  onGuardar: (input: ServicioInput) => Promise<void>;
}

export function ModalServicio({
  abierto,
  onCerrar,
  servicioInicial,
  planillaIdInicial,
  esIngreso = false,
  onGuardar,
}: Props) {
  const editando = Boolean(servicioInicial);
  const [nombre, setNombre] = useState(servicioInicial?.nombre ?? '');
  const [empresa, setEmpresa] = useState(servicioInicial?.empresa ?? '');
  const [nroCliente, setNroCliente] = useState(servicioInicial?.nro_cliente ?? '');
  const [urlPago, setUrlPago] = useState(servicioInicial?.url_pago ?? '');
  const [color, setColor] = useState(servicioInicial?.color ?? '#5F5E5A');
  const [acumulable, setAcumulable] = useState(servicioInicial?.acumulable ?? false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const planillaId = servicioInicial?.planilla_id ?? planillaIdInicial ?? '';

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) return setError('Poné un nombre al servicio.');

    setGuardando(true);
    try {
      await onGuardar({
        nombre: nombre.trim(),
        empresa: empresa.trim() || null,
        nro_cliente: nroCliente.trim() || null,
        planilla_id: planillaId,
        url_pago: urlPago.trim() || null,
        color,
        activo: servicioInicial?.activo ?? true,
        acumulable,
      });
      onCerrar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={
        esIngreso
          ? editando ? 'Editar concepto' : 'Nuevo concepto'
          : editando ? 'Editar servicio' : 'Nuevo servicio'
      }
    >
      <form onSubmit={enviar} className="flex flex-col gap-3">
        {error && <FormMessage tipo="error">{error}</FormMessage>}

        <div className={esIngreso ? '' : 'grid grid-cols-2 gap-3'}>
          <div>
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Luz" required />
          </div>
          {!esIngreso && (
            <div>
              <Label htmlFor="empresa">Proveedor</Label>
              <Input id="empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="EDET" />
            </div>
          )}
        </div>

        {!esIngreso && (
          <div>
            <Label htmlFor="nrocliente">N° de cliente</Label>
            <Input
              id="nrocliente"
              value={nroCliente}
              onChange={(e) => setNroCliente(e.target.value)}
              placeholder="3712458-001"
            />
          </div>
        )}

        <div>
          <Label htmlFor="srvcolor">Color</Label>
          <div className="flex items-center gap-2">
            <input
              id="srvcolor"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-10 cursor-pointer rounded-lg border border-border bg-surface"
            />
            <Input value={color} onChange={(e) => setColor(e.target.value)} className="tabular uppercase" />
          </div>
        </div>

        {!esIngreso && (
          <div>
            <Label htmlFor="url">Link de pago</Label>
            <Input
              id="url"
              type="url"
              value={urlPago}
              onChange={(e) => setUrlPago(e.target.value)}
              placeholder="https://…"
            />
          </div>
        )}

        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            checked={acumulable}
            onChange={(e) => setAcumulable(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
          />
          <span>
            <span className="font-semibold">Permite varias cargas por mes</span>
            <span className="block text-xs text-muted">
              Para gastos como nafta: cada carga suma al total del mes y se da por pagada en su fecha.
            </span>
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variante="secondary" onClick={onCerrar} disabled={guardando}>Cancelar</Button>
          <Button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
