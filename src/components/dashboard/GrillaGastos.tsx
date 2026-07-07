'use client';

import { useState } from 'react';
import type { GastoConServicio } from '@/types/modelos';
import {
  displayAIso,
  estaVencido,
  formatearFecha,
  formatearFechaCorta,
  formatearMonto,
  isoADisplay,
  sumarCargas,
  tuvoMovimiento,
  ultimaFechaCarga,
} from '@/lib/formateo';
import { PuntoColor } from '@/components/ui/Badge';
import { CalendarioMensual } from '@/components/ui/CalendarioMensual';
import { IconButton, IconLinkButton, clasesIconButton } from '@/components/ui/IconButton';
import { MenuAcciones } from '@/components/ui/MenuAcciones';
import { IconCamaraDoc, IconCheck, IconLink, IconMail, IconMas } from '@/components/ui/icons';

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
  /** Leer la factura (foto o documento) con IA para precargar el gasto (no se guarda el archivo).
   *  El selector nativo del dispositivo ofrece cámara, galería o archivos; el elegido se pasa al OCR. */
  onArchivo?: (g: GastoConServicio, archivo: File) => void;
  onEditarServicio?: (g: GastoConServicio) => void;
  onEliminarServicio?: (g: GastoConServicio) => void;
  onEditarGasto?: (g: GastoConServicio) => void;
  /** Edición al toque, directo en la celda (solo con la planilla desbloqueada). */
  onEditarMonto?: (g: GastoConServicio, monto: number | null) => void;
  onEditarVencimiento?: (g: GastoConServicio, vencimiento: string | null) => void;
  onTogglePago?: (g: GastoConServicio) => void;
  /** Gestionar las cargas del mes de un servicio acumulable (ej. nafta). */
  onCargas?: (g: GastoConServicio) => void;
  /** Alta de servicio desde la fila extra (solo con la planilla desbloqueada). */
  onAgregarServicio?: () => void;
  /** Ocultar la columna Vencimiento (para planillas de ingresos). */
  sinVencimiento?: boolean;
}

const COLS_EDIT     = 'grid grid-cols-[minmax(0,1.6fr)_7.5rem_7rem_6rem_10.5rem] items-center gap-3';
const COLS_EDIT_SV  = 'grid grid-cols-[minmax(0,1.6fr)_7.5rem_6rem_10.5rem] items-center gap-3';
const COLS_RO       = 'grid grid-cols-[minmax(0,1fr)_7.5rem_7rem_8rem] items-center gap-3';
const COLS_RO_SV    = 'grid grid-cols-[minmax(0,1fr)_7.5rem_8rem] items-center gap-3';
// Histórico > Ingresos: solo Ingreso y Monto (sin Vencimiento, sin Cobro, sin Acciones).
const COLS_RO_INGRESO = 'grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-3';

/** Banderas de estado de un gasto, compartidas por la vista escritorio y móvil. */
function flags(g: GastoConServicio) {
  const vencido = estaVencido(g.estado, g.vencimiento);
  const pagado = g.estado === 'pagado';
  // Pagado fuera de término: la fecha de pago es posterior al vencimiento.
  const pagadoTarde = pagado && Boolean(g.vencimiento && g.fecha_pago && g.fecha_pago > g.vencimiento);
  // Sin cargar: todavía no se confirmó un monto (fila "reiniciada" del mes) o,
  // si es acumulable, no tiene ninguna carga todavía.
  const sinCargar = !tuvoMovimiento(g);
  return { vencido, pagado, pagadoTarde, sinCargar };
}

/** Celda de Monto: con la planilla desbloqueada, se edita al toque (tipeando). */
function CeldaMonto({
  gasto,
  editable,
  onGuardar,
}: {
  gasto: GastoConServicio;
  editable: boolean;
  onGuardar: (monto: number | null) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState('');

  function empezar() {
    setBorrador(gasto.monto != null ? String(gasto.monto) : '');
    setEditando(true);
  }

  function confirmar() {
    const texto = borrador.trim();
    const monto = texto === '' ? null : Number(texto.replace(',', '.'));
    if (monto === null || (!Number.isNaN(monto) && monto >= 0)) {
      if (monto !== gasto.monto) onGuardar(monto);
    }
    setEditando(false);
  }

  if (editando) {
    return (
      <input
        autoFocus
        type="text"
        inputMode="decimal"
        value={borrador}
        onChange={(e) => setBorrador(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); confirmar(); }
          if (e.key === 'Escape') { e.preventDefault(); setEditando(false); }
        }}
        className="tabular w-full rounded-lg border border-muted bg-surface-2 px-2 py-1 text-sm font-extrabold text-foreground outline-none"
      />
    );
  }

  const contenido = gasto.monto_confirmado ? (
    <span className="tabular font-extrabold">{formatearMonto(gasto.monto)}</span>
  ) : (
    <span className="tabular font-semibold italic text-muted" title="Monto a confirmar">
      {formatearMonto(gasto.monto)}
    </span>
  );

  if (!editable) return <div className="min-w-0">{contenido}</div>;

  return (
    <button
      type="button"
      onClick={empezar}
      title="Editar monto"
      className="min-w-0 rounded text-left transition-opacity hover:opacity-70"
    >
      {contenido}
    </button>
  );
}

/** Celda de Vencimiento: con la planilla desbloqueada, se edita del calendario
 *  desplegable (mismo componente que en "Editar gasto del mes"). */
function CeldaVencimiento({
  gasto,
  vencido,
  editable,
  onGuardar,
}: {
  gasto: GastoConServicio;
  vencido: boolean;
  editable: boolean;
  onGuardar: (vencimiento: string | null) => void;
}) {
  const contenido = (
    <>
      <span className={vencido ? 'font-bold text-danger' : ''}>{formatearFecha(gasto.vencimiento)}</span>
      {vencido && <span className="ml-1 text-xs font-semibold text-danger md:ml-0 md:block">vencido</span>}
    </>
  );

  if (!editable) {
    return <div className="tabular text-sm">{contenido}</div>;
  }

  // Sin monto cargado todavía: no tiene sentido fijar un vencimiento antes que eso.
  if (gasto.monto == null) {
    return (
      <div className="tabular text-sm text-muted/60" title="Cargá el monto antes de fijar el vencimiento">
        {contenido}
      </div>
    );
  }

  return (
    <CalendarioMensual
      value={isoADisplay(gasto.vencimiento)}
      onElegir={(display) => onGuardar(displayAIso(display))}
    >
      {({ alternar }) => (
        <button
          type="button"
          onClick={alternar}
          title="Editar vencimiento"
          className="tabular text-left text-sm transition-opacity hover:opacity-70"
        >
          {contenido}
        </button>
      )}
    </CalendarioMensual>
  );
}

export function GrillaGastos({
  gastos,
  pieTotal,
  colorPie = 'danger',
  soloLectura = false,
  puedeEditar = false,
  sinVencimiento = false,
  onArchivo,
  onEditarServicio,
  onEliminarServicio,
  onEditarGasto,
  onEditarMonto,
  onEditarVencimiento,
  onTogglePago,
  onCargas,
  onAgregarServicio,
}: Props) {
  // Histórico > Ingresos: la grilla se reduce a Ingreso + Monto.
  const soloIngresoYMonto = soloLectura && sinVencimiento;
  // Móvil: qué fila está expandida mostrando su detalle (una sola a la vez).
  const [expandida, setExpandida] = useState<string | null>(null);
  const cols = soloIngresoYMonto
    ? COLS_RO_INGRESO
    : soloLectura
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
          {g.origen_email && (
            <span title="Cargado automáticamente desde un correo" className="shrink-0 text-muted">
              <IconMail size={14} />
            </span>
          )}
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
    return (
      <CeldaMonto
        gasto={g}
        editable={puedeEditar}
        onGuardar={(monto) => onEditarMonto?.(g, monto)}
      />
    );
  };

  const Vencimiento = (g: GastoConServicio, vencido: boolean) => {
    // Los servicios acumulables (nafta) se pagan al cargar: no tienen vencimiento.
    if (g.servicios?.acumulable) return <div className="tabular text-sm text-muted">—</div>;
    return (
      <CeldaVencimiento
        gasto={g}
        vencido={vencido}
        editable={puedeEditar}
        onGuardar={(vencimiento) => onEditarVencimiento?.(g, vencimiento)}
      />
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
        ) : g.monto == null ? (
          <button
            type="button"
            aria-label="Sin monto cargado: no se puede marcar como pagado"
            title="Sin monto cargado: no se puede marcar como pagado"
            disabled
            className="-ml-1 cursor-not-allowed rounded p-1 text-muted/40"
          >
            <IconCheck />
          </button>
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
    // En ingresos, "servicio" se llama "concepto" de cara al usuario.
    const nombreEditable = sinVencimiento ? 'concepto' : 'servicio';
    // En acumulables no se edita un monto único: las cargas se gestionan aparte.
    const menu = acum
      ? [
          { label: `Editar ${nombreEditable}`, onClick: () => onEditarServicio?.(g) },
          { label: `Eliminar ${nombreEditable}`, onClick: () => onEliminarServicio?.(g), peligro: true },
        ]
      : [
          { label: `Editar ${nombreEditable}`, onClick: () => onEditarServicio?.(g) },
          { label: sinVencimiento ? 'Editar monto' : 'Editar gasto del mes', onClick: () => onEditarGasto?.(g) },
          { label: `Eliminar ${nombreEditable}`, onClick: () => onEliminarServicio?.(g), peligro: true },
        ];
    return (
    <div className="flex items-center justify-end gap-1.5">
      {/* Acumulable (nafta): botón para ver/agregar las cargas del mes. */}
      {acum && (
        <IconButton aria-label="Cargas del mes" title="Cargas del mes" onClick={() => onCargas?.(g)}>
          <IconMas />
        </IconButton>
      )}
      {/* Cámara/documento en un solo botón: sin `capture`, el propio dispositivo
          ofrece cámara, galería o archivos. El elegido se envía al OCR. */}
      <label
        aria-label="Leer factura por foto o documento"
        title="Leer factura por foto o documento"
        className={`${clasesIconButton} cursor-pointer`}
      >
        <IconCamaraDoc />
        <input
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onArchivo?.(g, file);
            e.target.value = '';
          }}
        />
      </label>
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
          <span>{sinVencimiento ? 'Concepto' : 'Servicio'}</span>
          <span>Monto</span>
          {!sinVencimiento && <span>Vencimiento</span>}
          {!soloIngresoYMonto && <span>{sinVencimiento ? 'Cobro' : 'Pago'}</span>}
          {!soloLectura && <span className="text-right">Acciones</span>}
        </div>

        {vacia && (
          <p className="px-4 py-8 text-center text-sm text-muted">No hay gastos en esta planilla.</p>
        )}

        {gastos.map((g) => {
          const f = flags(g);
          // Iluminadas solo las pendientes con monto ya cargado. El resto
          // (pagadas, o sin monto todavía) queda atenuado. En Histórico (solo
          // lectura) se atenúa la fila entera; en el Mes, si está pagada se
          // deja el Pago (verde/rojo) a opacidad plena para que el color no
          // se vea grisáceo.
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
              {!soloIngresoYMonto && Pago(g, f)}
              {!soloLectura && Acciones(g)}
            </div>
          );
        })}
      </div>

      {/* -------- Móvil: filas compactas, expandibles al toque -------- */}
      <div className="md:hidden">
        {vacia && (
          <p className="px-4 py-8 text-center text-sm text-muted">No hay gastos en esta planilla.</p>
        )}

        {gastos.map((g) => {
          const f = flags(g);
          const dimCls = f.pagado || f.sinCargar ? 'opacity-60' : '';
          const filaDim = soloLectura ? dimCls : f.pagado ? '' : dimCls;
          const celdaDim = soloLectura ? '' : f.pagado ? dimCls : '';
          const acum = Boolean(g.servicios?.acumulable);
          const abierta = expandida === g.id;
          const sub = [g.servicios?.empresa, g.servicios?.nro_cliente].filter(Boolean).join(' · ');

          // Acción rápida al borde derecho de la fila compacta: marcar pagado/cobrado
          // (o agregar carga si es acumulable). El resto vive en la fila expandida.
          const rapida = (() => {
            if (soloIngresoYMonto) return null;
            if (soloLectura) {
              const pagadoRO = acum ? Boolean(ultimaFechaCarga(g.cargas)) : f.pagado;
              return (
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center ${
                    !pagadoRO ? 'text-transparent' : f.pagadoTarde ? 'text-danger' : 'text-brand'
                  }`}
                >
                  {pagadoRO && <IconCheck size={16} />}
                </span>
              );
            }
            if (acum) {
              return (
                <button
                  type="button"
                  aria-label="Cargas del mes"
                  title="Cargas del mes"
                  onClick={() => onCargas?.(g)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:text-brand"
                >
                  <IconMas />
                </button>
              );
            }
            if (f.pagado) {
              return (
                <button
                  type="button"
                  aria-label="Pagado — tocar para marcar como pendiente"
                  title="Pagado — tocar para marcar como pendiente"
                  onClick={() => onTogglePago?.(g)}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    f.pagadoTarde ? 'text-danger' : 'text-brand'
                  }`}
                >
                  <IconCheck />
                </button>
              );
            }
            if (g.monto == null) {
              return (
                <button
                  type="button"
                  aria-label="Sin monto cargado: no se puede marcar como pagado"
                  title="Sin monto cargado: no se puede marcar como pagado"
                  disabled
                  className="flex h-9 w-9 shrink-0 cursor-not-allowed items-center justify-center rounded-lg text-muted/40"
                >
                  <IconCheck />
                </button>
              );
            }
            return (
              <button
                type="button"
                aria-label="Marcar como pagado hoy"
                title="Marcar como pagado hoy"
                onClick={() => onTogglePago?.(g)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:text-brand"
              >
                <IconCheck />
              </button>
            );
          })();

          return (
            <div key={g.id} className={`border-b border-border last:border-0 ${filaDim}`}>
              <div className="flex items-center pl-4 pr-2">
                <button
                  type="button"
                  aria-expanded={abierta}
                  onClick={() => setExpandida(abierta ? null : g.id)}
                  className={`flex min-w-0 flex-1 items-center gap-2 py-2.5 text-left ${celdaDim}`}
                >
                  {g.servicios && <PuntoColor color={g.servicios.color} />}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{g.servicios?.nombre ?? '—'}</span>
                      {g.origen_email && (
                        <span title="Cargado automáticamente desde un correo" className="shrink-0 text-muted">
                          <IconMail size={13} />
                        </span>
                      )}
                    </span>
                    {/* Vencimiento a la vista solo mientras está pendiente. */}
                    {!sinVencimiento && !acum && !f.pagado && g.vencimiento && (
                      <span
                        className={`block text-[0.7rem] ${
                          f.vencido ? 'font-semibold text-danger' : 'text-muted'
                        }`}
                      >
                        Vence {formatearFechaCorta(g.vencimiento)}
                        {f.vencido && ' — vencido'}
                      </span>
                    )}
                  </span>
                  <span
                    className={`tabular shrink-0 text-sm ${
                      acum || g.monto_confirmado
                        ? 'font-extrabold'
                        : 'font-semibold italic text-muted'
                    }`}
                  >
                    {formatearMonto(
                      acum ? (g.cargas?.length ? sumarCargas(g.cargas) : null) : g.monto,
                    )}
                  </span>
                </button>
                {rapida}
              </div>

              {abierta && (
                <div className="flex flex-col gap-2.5 px-4 pb-3">
                  {sub && <div className={`text-xs text-muted ${celdaDim}`}>{sub}</div>}
                  <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
                    {/* El monto de la línea compacta no es editable: acá sí (al toque
                        con la planilla desbloqueada) y con el detalle de cargas. */}
                    {(puedeEditar || acum) && !soloLectura && (
                      <div className={celdaDim}>
                        <span className="mb-0.5 block text-[0.7rem] uppercase tracking-wide text-muted">
                          Monto
                        </span>
                        {Monto(g)}
                      </div>
                    )}
                    {!sinVencimiento && !acum && (
                      <div className={celdaDim}>
                        <span className="mb-0.5 block text-[0.7rem] uppercase tracking-wide text-muted">
                          Vencimiento
                        </span>
                        {Vencimiento(g, f.vencido)}
                      </div>
                    )}
                    {!soloIngresoYMonto && (
                      <div>
                        <span className="mb-0.5 block text-[0.7rem] uppercase tracking-wide text-muted">
                          {sinVencimiento ? 'Cobro' : 'Pago'}
                        </span>
                        {Pago(g, f)}
                      </div>
                    )}
                  </div>
                  {!soloLectura && Acciones(g)}
                </div>
              )}
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
          <IconMas size={16} /> {sinVencimiento ? 'Agregar concepto' : 'Agregar gasto o servicio'}
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
