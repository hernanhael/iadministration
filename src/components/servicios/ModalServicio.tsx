'use client';

import { useState } from 'react';
import type { ServicioInput } from '@/hooks/useServicios';
import type { Planilla, ServicioConPlanilla } from '@/types/modelos';
import { porNombre } from '@/lib/formateo';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { SelectorOpciones } from '@/components/ui/SelectorOpciones';
import { FormMessage } from '@/components/ui/FormMessage';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  planillas: Planilla[];
  servicioInicial?: ServicioConPlanilla | null;
  /** Planilla preseleccionada al crear (ej. "Agregar servicio" desde una planilla). */
  planillaIdInicial?: string;
  onGuardar: (input: ServicioInput) => Promise<void>;
}

export function ModalServicio({
  abierto,
  onCerrar,
  planillas,
  servicioInicial,
  planillaIdInicial,
  onGuardar,
}: Props) {
  const editando = Boolean(servicioInicial);
  const [nombre, setNombre] = useState(servicioInicial?.nombre ?? '');
  const [empresa, setEmpresa] = useState(servicioInicial?.empresa ?? '');
  const [nroCliente, setNroCliente] = useState(servicioInicial?.nro_cliente ?? '');
  const [planillaId, setPlanillaId] = useState(
    servicioInicial?.planilla_id ?? planillaIdInicial ?? '',
  );
  const [diaVenc, setDiaVenc] = useState(
    servicioInicial?.dia_vencimiento != null ? String(servicioInicial.dia_vencimiento) : '',
  );
  const [urlPago, setUrlPago] = useState(servicioInicial?.url_pago ?? '');
  const [color, setColor] = useState(servicioInicial?.color ?? '#5F5E5A');
  const [activo, setActivo] = useState(servicioInicial?.activo ?? true);
  const [acumulable, setAcumulable] = useState(servicioInicial?.acumulable ?? false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) return setError('Poné un nombre al servicio.');
    if (!planillaId) return setError('Elegí una planilla.');

    const dia = diaVenc.trim() === '' ? null : Number(diaVenc);
    if (dia !== null && (Number.isNaN(dia) || dia < 1 || dia > 31))
      return setError('El día de vencimiento debe estar entre 1 y 31.');

    setGuardando(true);
    try {
      await onGuardar({
        nombre: nombre.trim(),
        empresa: empresa.trim() || null,
        nro_cliente: nroCliente.trim() || null,
        planilla_id: planillaId,
        dia_vencimiento: dia,
        url_pago: urlPago.trim() || null,
        color,
        activo,
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
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={editando ? 'Editar servicio' : 'Nuevo servicio'}>
      <form onSubmit={enviar} className="flex flex-col gap-4">
        {error && <FormMessage tipo="error">{error}</FormMessage>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Luz" required />
          </div>
          <div>
            <Label htmlFor="empresa">Proveedor</Label>
            <Input id="empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="EDET" />
          </div>
        </div>

        <div>
          <Label htmlFor="nrocliente">N° de cliente</Label>
          <Input
            id="nrocliente"
            value={nroCliente}
            onChange={(e) => setNroCliente(e.target.value)}
            placeholder="3712458-001"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="planilla">Planilla</Label>
            <SelectorOpciones
              id="planilla"
              value={planillaId}
              onChange={setPlanillaId}
              placeholder="Elegí una planilla…"
              opciones={[...planillas]
                .sort(porNombre)
                .map((p) => ({ value: p.id, label: p.nombre }))}
            />
          </div>
          <div>
            <Label htmlFor="srvcolor">Color</Label>
            <div className="flex items-center gap-2">
              <input
                id="srvcolor"
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
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="dia">Día de vencimiento</Label>
            <Input
              id="dia"
              type="number"
              min="1"
              max="31"
              value={diaVenc}
              onChange={(e) => setDiaVenc(e.target.value)}
              placeholder="10"
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="h-4 w-4 accent-[var(--brand)]"
              />
              Activo
            </label>
          </div>
        </div>

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
              Para gastos como la nafta: cada carga suma al total del mes y se da por pagada en su
              fecha (sin vencimiento).
            </span>
          </span>
        </label>

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
