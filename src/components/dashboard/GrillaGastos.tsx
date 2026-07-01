'use client';

import type { GastoConServicio } from '@/types/modelos';
import {
  estaVencido,
  formatearFecha,
  formatearFechaCorta,
  formatearMonto,
  sumarCargas,
  ultimaFechaCarga,
} from '@/lib/formateo';
import { PuntoColor } from '@/components/ui/Badge';
import { IconButton, IconLinkButton, clasesIconButton } from '@/components/ui/IconButton';
import { MenuAcciones } from '@/components/ui/MenuAcciones';
import { IconCamara, IconCheck, IconDoc, IconLink, IconMas } from '@/components/ui/icons';

interface Props {
  gastos: GastoConServicio[];
  /** Franja al pie con el total del rubro/planilla. */
  pieTotal?: { label: string; monto: number };
  /** Color de la franja de total: 'danger' (rojo, egresos) o 'success' (verde, ingresos). */
  colorPie?: 'danger' | 'success';
  /** Solo lectura (Histórico): sin botones de acción ni toggle de pago. */
  soloLectura?: boolean;
  /** Planilla desbloqueada: muestra el ⋯ de cada fila y la fila "Agregar servicio". */
  puedeEditar?: boolean;
  /** Cámara: leer la factura por foto con IA para precargar el gasto (no se guarda la imagen).
   *  La foto se captura en la propia fila (entrada de cámara) y se pasa al OCR ya tomada. */
  onFoto?: (g: GastoConServicio, archivo: File) => void;
  /** Documento adjunto (imagen/PDF): mismo OCR que la cámara; tampoco se guarda. */
  onDoc?: (g: GastoConServicio) => void;
  onEditarServicio?: (g: GastoConServicio) => void;
  onEliminarServicio?: (g: GastoConServicio) => void;
  onEditarGasto?: (g: GastoConServicio) => void;
  onTogglePago?: (g: GastoConServicio) => void;
  /** Gestionar las cargas del mes de un servicio acumulable (ej. nafta). */
  onCargas?: (g: GastoConServicio) => void;
  /** Alta de servicio desde la fila extra (solo con la planilla desbloqueada). */
  onAgregarServicio?: () => void;
  /** Ocultar la columna Vencimiento (para planillas de ingresos). */
  sinVencimiento?: boolean;
}

const COLS_EDIT    = 'grid grid-cols-[minmax(0,1.6fr)_7.5rem_7rem_6rem_10.5rem] items-center gap-3';
const COLS_EDIT_SV = 'grid grid-cols-[minmax(0,1.6fr)_7.5rem_6rem_10.5rem] items-center gap-3';
const COLS_RO      = 'grid grid-cols-[minmax(0,1fr)_7.5rem_7rem_8rem] items-center gap-3';
const COLS_RO_SV   = 'grid grid-cols-[minmax(0,1fr)_7.5rem_8rem] items-center gap-3';

/** Banderas de estado de un gasto, compartidas por la vista escritorio y móvil. */
function flags(g: GastoConServicio) {
  const vencido = estaVencido(g.estado, g.vencimiento);
  const pagado = g.estado === 'pagado';
  // Pagado fuera de término: la fecha de pago es posterior al vencimiento.
  const pagadoTarde = pagado && Boolean(g.vencimiento && g.fecha_pago && g.fecha_pago > g.vencimiento);
  // Sin cargar: todavía no se confirmó un monto (fila "reiniciada" del mes) o,
  // si es acumulable, no tiene ninguna carga todavía.
  const sinCargar = g.servicios?.acumulable ? (g.cargas?.length ?? 0) === 0 : g.monto == null;
  return { vencido, pagado, pagadoTarde, sinCargar };
}

export function GrillaGastos({
  gastos,
  pieTotal,
  colorPie = 'danger',
  soloLectura = false,
  puedeEditar = false,
  sinVencimiento = false,
  onFoto,
  onDoc,
  onEditarServicio,
  onEliminarServicio,
  onEditarGasto,
  onTogglePago,
  onCargas,
  onAgregarServicio,
}: Props) {
  const cols = soloLectura
    ? sinVencimiento ? COLS_RO_SV : COLS_RO
    : sinVencimiento ? COLS_EDIT_SV : COLS_EDIT;

  // ----- Celdas reutilizables (mismas en escritorio y móvil) -----

  const Servicio = (g: GastoConServicio) => {
    const sub = [g.servicios?.empresa, g.servicios?.nro_cliente].filter(Boolean).join(' · ');
    return (
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {g.servicios && <PuntoColor color={g.servicios.color} />}
          <span className="truncate text-sm font-semibold">{g.servicios?.nombre ?? '—'}</span>
        </div>
        {sub && <div className="mt-0.5 truncate text-xs text-muted">{sub}</div>}
      </div>
    );
  };

  const Monto = (g: GastoConServicio) => {
    // Servicio acumulable (nafta): el monto es la suma de las cargas del mes.
    if (g.servicios?.acumulable) {
      const n = g.cargas?.length ?? 0;
      return (
        <div className="min-w-0">
          <span className="tabular font-extrabold">{formatearMonto(sumarCargas(g.cargas))}</span>
          <div className="mt-0.5 text-xs text-muted">
            {n === 0 ? 'Sin cargas' : `${n} carga${n > 1 ? 's' : ''}`}
          </div>
        </div>
      );
    }
    return g.monto_confirmado ? (
      <span className="tabular font-extrabold">{formatearMonto(g.monto)}</span>
    ) : (
      <span className="tabular font-semibold italic text-muted" title="Monto a confirmar">
        {formatearMonto(g.monto)}
      </span>
    );
  };

  const Vencimiento = (g: GastoConServicio, vencido: boolean) => {
    // Los servicios acumulables (nafta) se pagan al cargar: no tienen vencimiento.
    if (g.servicios?.acumulable) return <div className="tabular text-sm text-muted">—</div>;
    return (
      <div className="tabular text-sm">
        <span className={vencido ? 'font-bold text-danger' : ''}>{formatearFecha(g.vencimiento)}</span>
        {vencido && <span className="ml-1 text-xs font-semibold text-danger md:ml-0 md:block">vencido</span>}
      </div>
    );
  };

  const Pago = (g: GastoConServicio, f: ReturnType<typeof flags>) => {
    const { pagado, pagadoTarde } = f;
    // Acumulable: cada carga ya está paga; mostramos la fecha de la última carga
    // (sin toggle, no hay "pendiente" para estos servicios).
    if (g.servicios?.acumulable) {
      const ult = ultimaFechaCarga(g.cargas);
      return (
        <div className="tabular text-sm">
          {ult ? (
            <span className="inline-flex items-center gap-1 font-semibold text-brand">
              <IconCheck size={14} />
              {formatearFechaCorta(ult)}
            </span>
          ) : (
            <span className="text-muted">Sin cargas</span>
          )}
        </div>
      );
    }
    if (soloLectura) {
      return (
        <div className="tabular text-sm">
          {pagado ? (
            <>
              <span
                className={`inline-flex items-center gap-1 font-semibold ${pagadoTarde ? 'text-danger' : 'text-brand'}`}
              >
                <IconCheck size={14} />
                {formatearFechaCorta(g.fecha_pago)}
              </span>
              {pagadoTarde && <div className="text-xs font-semibold text-danger">vencido</div>}
            </>
          ) : (
            <span className="text-muted">Sin pagar</span>
          )}
        </div>
      );
    }
    return (
      <div className="text-sm">
        {pagado ? (
          <>
            <button
              type="button"
              onClick={() => onTogglePago?.(g)}
              title={
                pagadoTarde
                  ? 'Pagado fuera de término — clic para marcar como pendiente'
                  : 'Pagado — clic para marcar como pendiente'
              }
              className={`tabular inline-flex items-center gap-1 rounded font-semibold transition-opacity hover:opacity-70 ${
                pagadoTarde ? 'text-danger' : 'text-brand'
              }`}
            >
              <IconCheck size={14} />
              {formatearFechaCorta(g.fecha_pago)}
            </button>
            {pagadoTarde && <div className="text-xs font-semibold text-danger">vencido</div>}
          </>
        ) : (
          <button
            type="button"
            aria-label="Marcar como pagado hoy"
            title="Marcar como pagado hoy"
            onClick={() => onTogglePago?.(g)}
            className="-ml-1 rounded p-1 text-muted transition-colors hover:text-brand"
          >
            <IconCheck />
          </button>
        )}
      </div>
    );
  };

  const Acciones = (g: GastoConServicio) => {
    const acum = Boolean(g.servicios?.acumulable);
    // En acumulables no se edita un monto único: las cargas se gestionan aparte.
    const menu = acum
      ? [
          { label: 'Editar servicio', onClick: () => onEditarServicio?.(g) },
          { label: 'Eliminar servicio', onClick: () => onEliminarServicio?.(g), peligro: true },
        ]
      : [
          { label: 'Editar servicio', onClick: () => onEditarServicio?.(g) },
          { label: 'Editar gasto del mes', onClick: () => onEditarGasto?.(g) },
          { label: 'Eliminar servicio', onClick: () => onEliminarServicio?.(g), peligro: true },
        ];
    return (
    <div className="flex items-center justify-end gap-1.5">
      {/* Acumulable (nafta): botón para ver/agregar las cargas del mes. */}
      {acum && (
        <IconButton aria-label="Cargas del mes" title="Cargas del mes" onClick={() => onCargas?.(g)}>
          <IconMas />
        </IconButton>
      )}
      {/* Cámara: la entrada de archivo con `capture` abre la cámara directamente
          (dentro del gesto del usuario); la foto tomada se envía al OCR. */}
      <label
        aria-label="Sacar foto de la factura"
        title="Sacar foto de la factura"
        className={`${clasesIconButton} cursor-pointer`}
      >
        <IconCamara />
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFoto?.(g, file);
            e.target.value = '';
          }}
        />
      </label>
      <IconButton
        aria-label="Leer datos de un documento"
        title="Leer datos de un documento (imagen o PDF)"
        onClick={() => onDoc?.(g)}
      >
        <IconDoc />
      </IconButton>
      {/* El link a la plataforma solo aparece si el servicio tiene una URL cargada. */}
      {g.servicios?.url_pago && (
        <IconLinkButton
          aria-label="Ir a la plataforma del servicio"
          title="Ir a la plataforma del servicio"
          href={g.servicios.url_pago}
          target="_blank"
          rel="noopener noreferrer"
        >
          <IconLink />
        </IconLinkButton>
      )}
      {/* El ⋯ (editar/eliminar el servicio o el gasto) solo aparece con la
          planilla desbloqueada; la cámara/documento/link quedan siempre. */}
      {puedeEditar && <MenuAcciones acciones={menu} />}
    </div>
    );
  };

  const vacia = gastos.length === 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      {/* -------- Escritorio: tabla en grilla -------- */}
      <div className="hidden md:block">
        <div className={`${cols} border-b border-border px-4 py-2.5 text-xs uppercase tracking-wide text-muted`}>
          <span>Servicio</span>
          <span>Monto</span>
          {!sinVencimiento && <span>Vencimiento</span>}
          <span>Pago</span>
          {!soloLectura && <span className="text-right">Acciones</span>}
        </div>

        {vacia && (
          <p className="px-4 py-8 text-center text-sm text-muted">No hay gastos en esta planilla.</p>
        )}

        {gastos.map((g) => {
          const f = flags(g);
          // Atenuadas: pagadas o sin cargar (fila "reiniciada", nada confirmado
          // todavía). En Histórico (solo lectura) se atenúa la fila entera; en el
          // Mes, si está pagada se deja el Pago (verde/rojo) a opacidad plena para
          // que el color no se vea grisáceo, pero sin cargar sí atenúa la fila
          // completa (no hay nada "iluminado" que resaltar todavía).
          const dimCls = f.pagado || f.sinCargar ? 'opacity-60' : '';
          const filaDim = soloLectura ? dimCls : f.pagado ? '' : dimCls;
          const celdaDim = soloLectura ? '' : f.pagado ? dimCls : '';
          return (
            <div
              key={g.id}
              className={`${cols} border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-surface-2/40 ${filaDim}`}
            >
              <div className={`min-w-0 ${celdaDim}`}>{Servicio(g)}</div>
              <div className={celdaDim}>{Monto(g)}</div>
              {!sinVencimiento && <div className={celdaDim}>{Vencimiento(g, f.vencido)}</div>}
              {Pago(g, f)}
              {!soloLectura && Acciones(g)}
            </div>
          );
        })}
      </div>

      {/* -------- Móvil: tarjetas apiladas -------- */}
      <div className="md:hidden">
        {vacia && (
          <p className="px-4 py-8 text-center text-sm text-muted">No hay gastos en esta planilla.</p>
        )}

        {gastos.map((g) => {
          const f = flags(g);
          const dimCls = f.pagado || f.sinCargar ? 'opacity-60' : '';
          const filaDim = soloLectura ? dimCls : f.pagado ? '' : dimCls;
          const celdaDim = soloLectura ? '' : f.pagado ? dimCls : '';
          return (
            <div key={g.id} className={`border-b border-border px-4 py-3 last:border-0 ${filaDim}`}>
              <div className={`flex items-start justify-between gap-3 ${celdaDim}`}>
                {Servicio(g)}
                <div className="shrink-0 text-right">{Monto(g)}</div>
              </div>

              <div className="mt-2.5 flex items-end justify-between gap-3">
                {!sinVencimiento && (
                  <div className={celdaDim}>
                    <span className="block text-[0.7rem] uppercase tracking-wide text-muted">Vencimiento</span>
                    {Vencimiento(g, f.vencido)}
                  </div>
                )}
                <div className={sinVencimiento ? 'w-full' : 'text-right'}>
                  <span className="mb-0.5 block text-[0.7rem] uppercase tracking-wide text-muted">Pago</span>
                  <div className={sinVencimiento ? '' : 'flex justify-end'}>{Pago(g, f)}</div>
                </div>
              </div>

              {!soloLectura && <div className="mt-3 border-t border-border pt-2.5">{Acciones(g)}</div>}
            </div>
          );
        })}
      </div>

      {/* -------- Fila "Agregar servicio" (solo con la planilla desbloqueada) -------- */}
      {!soloLectura && puedeEditar && onAgregarServicio && (
        <button
          type="button"
          onClick={onAgregarServicio}
          className="flex w-full items-center justify-center gap-1.5 border-t border-border px-4 py-3 text-sm font-semibold text-muted transition-colors hover:bg-surface-2/40 hover:text-foreground"
        >
          <IconMas size={16} /> Agregar gasto o servicio
        </button>
      )}

      {/* -------- Total del rubro (franja coloreada), común a ambas vistas -------- */}
      {pieTotal && (
        <div
          className={`flex items-center justify-between border-t px-4 py-2.5 ${
            colorPie === 'success'
              ? 'border-emerald-400/40 bg-emerald-400/15'
              : 'border-danger/40 bg-danger/15'
          }`}
        >
          <span
            className={`text-xs font-bold uppercase tracking-wide ${
              colorPie === 'success' ? 'text-emerald-400' : 'text-danger'
            }`}
          >
            Total
          </span>
          <span
            className={`tabular text-base font-extrabold ${
              colorPie === 'success' ? 'text-emerald-400' : 'text-danger'
            }`}
          >
            {formatearMonto(pieTotal.monto)}
          </span>
        </div>
      )}
    </div>
  );
}
