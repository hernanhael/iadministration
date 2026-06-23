'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGastos, type GastoInput } from '@/hooks/useGastos';
import { useServicios } from '@/hooks/useServicios';
import { usePlanillas } from '@/hooks/usePlanillas';
import type { Carga, GastoConServicio, Planilla, ServicioConPlanilla } from '@/types/modelos';
import { formatearMonto, formatearPeriodo, periodoActual, sumarCargas, ultimaFechaCarga } from '@/lib/formateo';
import { ResumenCards } from '@/components/dashboard/ResumenCards';
import { PlanillasPeriodo } from '@/components/dashboard/PlanillasPeriodo';
import { TabTipo } from '@/components/ui/TabTipo';
import { FormularioGasto } from '@/components/carga/FormularioGasto';
import { ModalOcr } from '@/components/carga/ModalOcr';
import { ModalCargas } from '@/components/carga/ModalCargas';
import { ModalServicio } from '@/components/servicios/ModalServicio';
import { ModalPlanilla } from '@/components/servicios/ModalPlanilla';
import { Modal } from '@/components/ui/Modal';
import { Confirmacion } from '@/components/ui/Confirmacion';
import { FormMessage } from '@/components/ui/FormMessage';
import { Toast } from '@/components/ui/Toast';

const periodo = periodoActual();

/** ¿Es una fila "reiniciada" del mes (servicio sin gasto cargado todavía)? */
function esNuevo(g: GastoConServicio): boolean {
  return g.id.startsWith('nuevo:');
}

/**
 * Fila del mes para un servicio que aún no tiene gasto cargado: monto y vencimiento
 * sin valor (a confirmar). Es el equivalente en cliente de la recurrencia
 * (`generar_gastos_periodo`) hasta que se cargue el documento (Fase 3/4).
 */
function filaReiniciada(s: ServicioConPlanilla, per: string): GastoConServicio {
  return {
    id: `nuevo:${s.id}`,
    user_id: s.user_id,
    servicio_id: s.id,
    periodo: per,
    monto: null,
    vencimiento: null,
    fecha_pago: null,
    estado: 'pendiente',
    monto_confirmado: false,
    observacion: null,
    cargas: [],
    created_at: '',
    servicios: {
      nombre: s.nombre,
      empresa: s.empresa,
      nro_cliente: s.nro_cliente,
      url_pago: s.url_pago,
      color: s.color,
      planilla_id: s.planilla_id,
      acumulable: s.acumulable,
      planillas: s.planillas,
    },
  };
}

export default function MesPage() {
  const { gastos, cargando, error, recargar: recargarGastos, crear, actualizar, generarPeriodo } = useGastos();
  const serv = useServicios();
  const pl = usePlanillas();

  const [tipo, setTipo] = useState<'egreso' | 'ingreso'>('egreso');

  // Recurrencia (Fase 3): al abrir el Mes, generar en el servidor los gastos
  // faltantes del período. Una sola vez por carga (idempotente; no-op en demo).
  const generado = useRef(false);
  useEffect(() => {
    if (generado.current) return;
    generado.current = true;
    void generarPeriodo(periodo);
  }, [generarPeriodo]);

  const [servicioModal, setServicioModal] = useState<{
    inicial: ServicioConPlanilla | null;
    planillaId?: string;
  } | null>(null);
  const [planillaModal, setPlanillaModal] = useState<{ inicial: Planilla | null } | null>(null);
  const [planillaABorrar, setPlanillaABorrar] = useState<Planilla | null>(null);
  const [gastoEnEdicion, setGastoEnEdicion] = useState<GastoConServicio | null>(null);
  const [ocrPara, setOcrPara] = useState<{
    gasto: GastoConServicio;
    modo: 'foto' | 'documento';
    archivo?: File;
  } | null>(null);
  const [servicioABorrar, setServicioABorrar] = useState<GastoConServicio | null>(null);
  const [cargasPara, setCargasPara] = useState<{
    gasto: GastoConServicio;
    draft?: Carga;
  } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Gastos del mes = los cargados + una fila "reiniciada" por cada servicio activo
  // que todavía no tiene gasto este período (se rearma al cambiar de mes).
  const delMes = useMemo(() => {
    const activosIds = new Set(serv.servicios.filter((s) => s.activo).map((s) => s.id));
    // Solo gastos del mes de servicios activos (los de inactivos quedan en Histórico)
    const existentes = gastos.filter(
      (g) => g.periodo === periodo && activosIds.has(g.servicio_id),
    );
    const conGasto = new Set(existentes.map((g) => g.servicio_id));
    const reiniciados = serv.servicios
      .filter((s) => s.activo && !conGasto.has(s.id))
      .map((s) => filaReiniciada(s, periodo));
    return [...existentes, ...reiniciados];
  }, [gastos, serv.servicios]);

  // Planillas y gastos del tipo activo (egresos o ingresos)
  const planillasDelTipo = useMemo(
    () => pl.planillas.filter((p) => p.tipo === tipo),
    [pl.planillas, tipo],
  );

  const gastosDelTipo = useMemo(
    () => delMes.filter((g) => g.servicios?.planillas?.tipo === tipo),
    [delMes, tipo],
  );

  // Totales globales del mes (ingresos + egresos) para las cards de balance.
  const resumenBalance = useMemo(() => {
    function sumarPorTipo(t: 'egreso' | 'ingreso') {
      const planillas = pl.planillas.filter((p) => p.tipo === t);
      const porPlanilla: Record<string, number> = {};
      for (const p of planillas) porPlanilla[p.id] = 0;
      let total = 0;
      let pagado = 0;
      for (const g of delMes) {
        if (g.servicios?.planillas?.tipo !== t) continue;
        const monto = g.monto ?? 0;
        total += monto;
        if (g.estado === 'pagado') pagado += monto;
        const id = g.servicios?.planilla_id;
        if (id && porPlanilla[id] !== undefined) porPlanilla[id] += monto;
      }
      return { total, pagado, planillas, porPlanilla };
    }
    return { ingresos: sumarPorTipo('ingreso'), egresos: sumarPorTipo('egreso') };
  }, [delMes, pl.planillas]);

  function togglePago(g: GastoConServicio) {
    const fecha_pago = g.estado === 'pagado' ? null : new Date().toISOString().slice(0, 10);
    const input: GastoInput = {
      servicio_id: g.servicio_id,
      periodo: g.periodo,
      monto: g.monto,
      vencimiento: g.vencimiento,
      fecha_pago,
      observacion: g.observacion,
    };
    // Fila reiniciada: todavía no existe el gasto → se crea al marcarlo pagado.
    const accion = esNuevo(g) ? crear(input) : actualizar(g.id, input);
    void accion.catch((e) => setAviso(e instanceof Error ? e.message : 'No se pudo guardar.'));
  }

  /** Guarda las cargas de un servicio acumulable: el monto es la suma y la fecha
   *  de pago, la de la última carga (cada carga se paga al hacerla). */
  function guardarCargas(g: GastoConServicio, cargas: Carga[]) {
    const input: GastoInput = {
      servicio_id: g.servicio_id,
      periodo: g.periodo,
      monto: cargas.length ? sumarCargas(cargas) : null,
      vencimiento: null,
      fecha_pago: ultimaFechaCarga(cargas),
      observacion: g.observacion,
      cargas,
    };
    return esNuevo(g) ? crear(input) : actualizar(g.id, input);
  }

  /** Abre el editor de servicio para el servicio del gasto de la fila. */
  function editarServicio(g: GastoConServicio) {
    const completo = serv.servicios.find((s) => s.id === g.servicio_id) ?? null;
    setServicioModal({ inicial: completo });
  }

  const barraEgresos = tipo === 'egreso' ? (() => {
    const { pagado, total } = resumenBalance.egresos;
    return { pagado, total, pct: total > 0 ? Math.round((pagado / total) * 100) : 0 };
  })() : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado con selector Ingresos/Egresos a la derecha */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Mes</h1>
          <p className="text-sm text-muted">{formatearPeriodo(periodo)}</p>
        </div>
        <TabTipo valor={tipo} onChange={setTipo} />
      </div>

      {error && <FormMessage tipo="error">{error}</FormMessage>}

      <ResumenCards
        totalIngresos={resumenBalance.ingresos.total}
        totalEgresos={resumenBalance.egresos.total}
        planillasIngresos={resumenBalance.ingresos.planillas}
        planillasEgresos={resumenBalance.egresos.planillas}
        porPlanillaIngresos={resumenBalance.ingresos.porPlanilla}
        porPlanillaEgresos={resumenBalance.egresos.porPlanilla}
      />

      {/* Barra de progreso de pago — solo en la pestaña Egresos */}
      {barraEgresos && (
        <div className="rounded-2xl border border-border bg-surface px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
            <span className="text-muted">Pagado del mes</span>
            <span className="tabular">
              <span className="font-bold text-muted">{formatearMonto(barraEgresos.pagado)}</span>
              <span className="text-muted"> / </span>
              <span className="font-bold text-danger">{formatearMonto(barraEgresos.total)}</span>
              <span className="ml-2 font-semibold text-muted">{barraEgresos.pct}%</span>
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-muted transition-all"
              style={{ width: `${barraEgresos.pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Planillas del tipo activo */}
      {cargando ? (
        <p className="py-10 text-center text-sm text-muted">Cargando…</p>
      ) : (
        <PlanillasPeriodo
          gastos={gastosDelTipo}
          planillas={planillasDelTipo}
          onFoto={(g, archivo) => setOcrPara({ gasto: g, modo: 'foto', archivo })}
          onDoc={(g) => setOcrPara({ gasto: g, modo: 'documento' })}
          onEditarServicio={editarServicio}
          onEditarGasto={(g) => setGastoEnEdicion(g)}
          onEliminarServicio={(g) => setServicioABorrar(g)}
          onTogglePago={togglePago}
          onCargas={(g) => setCargasPara({ gasto: g })}
          onEditarPlanilla={(p) => setPlanillaModal({ inicial: p })}
          onAgregarServicio={(p) => setServicioModal({ inicial: null, planillaId: p.id })}
          onEliminarPlanilla={(p) => setPlanillaABorrar(p)}
        />
      )}

      {/* Crear / editar servicio */}
      {servicioModal && (
        <ModalServicio
          abierto
          onCerrar={() => setServicioModal(null)}
          servicioInicial={servicioModal.inicial}
          planillaIdInicial={servicioModal.planillaId}
          onGuardar={async (input) => {
            if (servicioModal.inicial) await serv.actualizar(servicioModal.inicial.id, input);
            else await serv.crear(input);
          }}
        />
      )}

      {/* Crear / editar planilla (desde "+ Nueva planilla" o el ⋯ de cada planilla) */}
      {planillaModal && (
        <ModalPlanilla
          abierto
          onCerrar={() => setPlanillaModal(null)}
          planillaInicial={planillaModal.inicial}
          tipoInicial={tipo}
          onGuardar={async (input) => {
            if (planillaModal.inicial) await pl.actualizar(planillaModal.inicial.id, input);
            else await pl.crear(input);
          }}
        />
      )}

      {/* Eliminar planilla (avisa si tiene servicios asociados) */}
      <Confirmacion
        abierto={Boolean(planillaABorrar)}
        titulo="Eliminar planilla"
        peligro
        textoConfirmar="Eliminar"
        mensaje={
          <>
            ¿Eliminar la planilla <strong>{planillaABorrar?.nombre}</strong>?
          </>
        }
        onConfirmar={async () => {
          if (planillaABorrar) {
            try {
              await pl.eliminar(planillaABorrar.id);
              await recargarGastos();
            } catch (e) {
              setAviso(e instanceof Error ? e.message : 'No se pudo eliminar la planilla.');
            }
          }
          setPlanillaABorrar(null);
        }}
        onCancelar={() => setPlanillaABorrar(null)}
      />

      {/* Cargar / editar gasto del mes (monto, vencimiento, fecha de pago) */}
      {gastoEnEdicion && (
        <Modal
          abierto
          onCerrar={() => setGastoEnEdicion(null)}
          titulo={esNuevo(gastoEnEdicion) ? 'Cargar gasto del mes' : 'Editar gasto del mes'}
        >
          <FormularioGasto
            gastoInicial={gastoEnEdicion}
            onGuardar={(input) =>
              esNuevo(gastoEnEdicion) ? crear(input) : actualizar(gastoEnEdicion.id, input)
            }
            onExito={() => setGastoEnEdicion(null)}
            onCancelar={() => setGastoEnEdicion(null)}
          />
        </Modal>
      )}

      {/* Eliminar servicio */}
      <Confirmacion
        abierto={Boolean(servicioABorrar)}
        titulo="Eliminar servicio"
        peligro
        textoConfirmar="Eliminar"
        mensaje={
          <>
            ¿Eliminar el servicio <strong>{servicioABorrar?.servicios?.nombre}</strong>? No va a aparecer en los próximos meses. El historial anterior se conserva.
          </>
        }
        onConfirmar={async () => {
          if (servicioABorrar) {
            try {
              await serv.eliminar(servicioABorrar.servicio_id);
              await recargarGastos();
            } catch (e) {
              setAviso(e instanceof Error ? e.message : 'No se pudo eliminar el servicio.');
            }
          }
          setServicioABorrar(null);
        }}
        onCancelar={() => setServicioABorrar(null)}
      />

      {/* Leer factura/documento con IA (OCR) → precarga el formulario para confirmar.
          El archivo se procesa en memoria y no se guarda. */}
      {ocrPara && (
        <ModalOcr
          abierto
          modo={ocrPara.modo}
          servicioNombre={ocrPara.gasto.servicios?.nombre ?? 'gasto'}
          archivoInicial={ocrPara.archivo}
          onCerrar={() => setOcrPara(null)}
          onLeido={(datos) => {
            // Acumulable (nafta): el OCR carga UNA carga nueva; el resto, edita el gasto.
            if (ocrPara.gasto.servicios?.acumulable) {
              setCargasPara({
                gasto: ocrPara.gasto,
                draft: {
                  monto: datos.monto ?? 0,
                  fecha: datos.vencimiento ?? new Date().toISOString().slice(0, 10),
                },
              });
            } else {
              setGastoEnEdicion({
                ...ocrPara.gasto,
                monto: datos.monto ?? ocrPara.gasto.monto,
                vencimiento: datos.vencimiento ?? ocrPara.gasto.vencimiento,
                monto_confirmado: false,
              });
            }
            setOcrPara(null);
          }}
        />
      )}

      {/* Cargas del mes de un servicio acumulable (ej. nafta) */}
      {cargasPara && (
        <ModalCargas
          abierto
          servicioNombre={cargasPara.gasto.servicios?.nombre ?? 'servicio'}
          cargasIniciales={cargasPara.gasto.cargas ?? []}
          draftInicial={cargasPara.draft ?? null}
          onCerrar={() => setCargasPara(null)}
          onGuardar={(cargas) => guardarCargas(cargasPara.gasto, cargas)}
        />
      )}

      <Toast mensaje={aviso} onCerrar={() => setAviso(null)} />
    </div>
  );
}
