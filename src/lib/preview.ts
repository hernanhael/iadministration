// Modo "vista previa": cuando NO hay credenciales de Supabase configuradas,
// la app levanta igual con datos de ejemplo para revisar y modelar la UI.
// Apenas se completan NEXT_PUBLIC_SUPABASE_URL y _ANON_KEY, este modo se apaga.
import type { Planilla, GastoConServicio, ServicioConPlanilla } from '@/types/modelos';

export const SUPABASE_CONFIGURADO = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const ERROR_PREVIEW =
  'Estás en modo vista previa (sin Supabase). Conectá las variables de entorno para guardar cambios.';

const ahora = new Date().toISOString();

export const DEMO_PLANILLAS: Planilla[] = [
  { id: 'pl-auto', user_id: 'demo', nombre: 'Auto', detalle: 'Clío Mío', color: '#D98A4B', tipo: 'egreso', created_at: ahora },
  { id: 'pl-inm', user_id: 'demo', nombre: 'Inmueble', detalle: 'Ituzaingó 1247, Yerba Buena', color: '#6A8D73', tipo: 'egreso', created_at: ahora },
  { id: 'pl-per', user_id: 'demo', nombre: 'Personal', detalle: null, color: '#5B7DB1', tipo: 'egreso', created_at: ahora },
  { id: 'pl-trabajo', user_id: 'demo', nombre: 'Trabajo', detalle: null, color: '#4A90A4', tipo: 'ingreso', created_at: ahora },
];

function planillaResumen(plId: string) {
  const p = DEMO_PLANILLAS.find((x) => x.id === plId)!;
  return { nombre: p.nombre, detalle: p.detalle, color: p.color, tipo: p.tipo };
}

export const DEMO_SERVICIOS: ServicioConPlanilla[] = [
  { id: 'srv-luz', user_id: 'demo', planilla_id: 'pl-inm', nombre: 'Luz', empresa: 'EDET', nro_cliente: '3712458-001', url_pago: 'https://www.edet.com.ar', dia_vencimiento: 10, color: '#E8B84B', activo: true, acumulable: false, created_at: ahora, planillas: planillaResumen('pl-inm') },
  { id: 'srv-gas', user_id: 'demo', planilla_id: 'pl-inm', nombre: 'Gas', empresa: 'Gasnor', nro_cliente: 'NIS 70234561', url_pago: 'https://www.gasnor.com', dia_vencimiento: 18, color: '#E07A5F', activo: true, acumulable: false, created_at: ahora, planillas: planillaResumen('pl-inm') },
  { id: 'srv-agua', user_id: 'demo', planilla_id: 'pl-inm', nombre: 'Agua', empresa: 'SAT', nro_cliente: 'Cta 045-7789', url_pago: null, dia_vencimiento: 12, color: '#4A9DB8', activo: true, acumulable: false, created_at: ahora, planillas: planillaResumen('pl-inm') },
  { id: 'srv-exp', user_id: 'demo', planilla_id: 'pl-inm', nombre: 'Expensas', empresa: 'Cons. Av. Aconquija', nro_cliente: 'UF 4-B', url_pago: null, dia_vencimiento: 10, color: '#6A8D73', activo: true, acumulable: false, created_at: ahora, planillas: planillaResumen('pl-inm') },
  { id: 'srv-imp', user_id: 'demo', planilla_id: 'pl-inm', nombre: 'Imp. munic.', empresa: 'Municipalidad SMT', nro_cliente: 'Padrón 88231', url_pago: null, dia_vencimiento: 22, color: '#9B6A9E', activo: true, acumulable: false, created_at: ahora, planillas: planillaResumen('pl-inm') },
  { id: 'srv-gim', user_id: 'demo', planilla_id: 'pl-per', nombre: 'Gimnasio', empresa: 'SportClub', nro_cliente: 'Socio 12233', url_pago: 'https://sportclub.com.ar', dia_vencimiento: 1, color: '#D96459', activo: true, acumulable: false, created_at: ahora, planillas: planillaResumen('pl-per') },
  { id: 'srv-net', user_id: 'demo', planilla_id: 'pl-per', nombre: 'Netflix', empresa: 'Netflix', nro_cliente: 'hernan@…', url_pago: 'https://www.netflix.com/account', dia_vencimiento: 20, color: '#5B7DB1', activo: true, acumulable: false, created_at: ahora, planillas: planillaResumen('pl-per') },
  { id: 'srv-obs', user_id: 'demo', planilla_id: 'pl-per', nombre: 'Obra social', empresa: 'OSDE', nro_cliente: '6-12345678', url_pago: 'https://www.osde.com.ar', dia_vencimiento: 28, color: '#57A773', activo: true, acumulable: false, created_at: ahora, planillas: planillaResumen('pl-per') },
  { id: 'srv-seg', user_id: 'demo', planilla_id: 'pl-auto', nombre: 'Seguro auto', empresa: 'La Caja', nro_cliente: 'Póliza 88-4521', url_pago: 'https://www.lacaja.com.ar', dia_vencimiento: 15, color: '#5BA8C4', activo: true, acumulable: false, created_at: ahora, planillas: planillaResumen('pl-auto') },
  { id: 'srv-pat', user_id: 'demo', planilla_id: 'pl-auto', nombre: 'Patente', empresa: 'Rentas Tucumán', nro_cliente: 'Dominio AB123CD', url_pago: null, dia_vencimiento: 25, color: '#C47BA8', activo: true, acumulable: false, created_at: ahora, planillas: planillaResumen('pl-auto') },
  { id: 'srv-coch', user_id: 'demo', planilla_id: 'pl-auto', nombre: 'Cochera', empresa: 'Garage Centro', nro_cliente: null, url_pago: null, dia_vencimiento: 5, color: '#7B8DC4', activo: true, acumulable: false, created_at: ahora, planillas: planillaResumen('pl-auto') },
  { id: 'srv-naf', user_id: 'demo', planilla_id: 'pl-auto', nombre: 'Nafta', empresa: 'YPF', nro_cliente: null, url_pago: null, dia_vencimiento: null, color: '#D98A4B', activo: true, acumulable: true, created_at: ahora, planillas: planillaResumen('pl-auto') },
  // Planilla Trabajo (ingreso)
  { id: 'srv-sueldo', user_id: 'demo', planilla_id: 'pl-trabajo', nombre: 'Sueldo', empresa: null, nro_cliente: null, url_pago: null, dia_vencimiento: null, color: '#4A90A4', activo: true, acumulable: false, created_at: ahora, planillas: planillaResumen('pl-trabajo') },
  { id: 'srv-freelance', user_id: 'demo', planilla_id: 'pl-trabajo', nombre: 'Freelance', empresa: null, nro_cliente: null, url_pago: null, dia_vencimiento: null, color: '#8A6FA5', activo: true, acumulable: true, created_at: ahora, planillas: planillaResumen('pl-trabajo') },
];

function servResumen(srvId: string) {
  const s = DEMO_SERVICIOS.find((x) => x.id === srvId)!;
  return {
    nombre: s.nombre,
    empresa: s.empresa,
    nro_cliente: s.nro_cliente,
    url_pago: s.url_pago,
    color: s.color,
    planilla_id: s.planilla_id,
    acumulable: s.acumulable,
    planillas: s.planillas,
  };
}

export const DEMO_GASTOS: GastoConServicio[] = [
  // Período actual (2026-06)
  // (Luz/EDET no tiene gasto cargado este mes a propósito: aparece como fila "reiniciada".)
  { id: 'g2', user_id: 'demo', servicio_id: 'srv-exp', periodo: '2026-06', monto: 38000, vencimiento: '2026-06-10', fecha_pago: null, estado: 'pendiente', monto_confirmado: true, observacion: null, cargas: [], created_at: ahora, servicios: servResumen('srv-exp') },
  { id: 'g3', user_id: 'demo', servicio_id: 'srv-gas', periodo: '2026-06', monto: 21300, vencimiento: '2026-06-18', fecha_pago: null, estado: 'pendiente', monto_confirmado: false, observacion: 'Monto del mes anterior, a confirmar', cargas: [], created_at: ahora, servicios: servResumen('srv-gas') },
  { id: 'g4', user_id: 'demo', servicio_id: 'srv-imp', periodo: '2026-06', monto: 14200, vencimiento: '2026-06-22', fecha_pago: null, estado: 'pendiente', monto_confirmado: true, observacion: null, cargas: [], created_at: ahora, servicios: servResumen('srv-imp') },
  { id: 'g5', user_id: 'demo', servicio_id: 'srv-obs', periodo: '2026-06', monto: 25000, vencimiento: '2026-06-28', fecha_pago: null, estado: 'pendiente', monto_confirmado: true, observacion: null, cargas: [], created_at: ahora, servicios: servResumen('srv-obs') },
  { id: 'g6', user_id: 'demo', servicio_id: 'srv-agua', periodo: '2026-06', monto: 12500, vencimiento: '2026-06-12', fecha_pago: '2026-06-09', estado: 'pagado', monto_confirmado: true, observacion: null, cargas: [], created_at: ahora, servicios: servResumen('srv-agua') },
  { id: 'g7', user_id: 'demo', servicio_id: 'srv-gim', periodo: '2026-06', monto: 25000, vencimiento: '2026-06-01', fecha_pago: '2026-06-02', estado: 'pagado', monto_confirmado: true, observacion: null, cargas: [], created_at: ahora, servicios: servResumen('srv-gim') },
  { id: 'g8', user_id: 'demo', servicio_id: 'srv-net', periodo: '2026-06', monto: 8000, vencimiento: '2026-06-20', fecha_pago: '2026-06-04', estado: 'pagado', monto_confirmado: true, observacion: null, cargas: [], created_at: ahora, servicios: servResumen('srv-net') },
  // Planilla Auto (2026-06)
  { id: 'g-a1', user_id: 'demo', servicio_id: 'srv-seg', periodo: '2026-06', monto: 31500, vencimiento: '2026-06-15', fecha_pago: null, estado: 'pendiente', monto_confirmado: true, observacion: null, cargas: [], created_at: ahora, servicios: servResumen('srv-seg') },
  { id: 'g-a2', user_id: 'demo', servicio_id: 'srv-pat', periodo: '2026-06', monto: 18700, vencimiento: '2026-06-25', fecha_pago: null, estado: 'pendiente', monto_confirmado: false, observacion: null, cargas: [], created_at: ahora, servicios: servResumen('srv-pat') },
  { id: 'g-a3', user_id: 'demo', servicio_id: 'srv-coch', periodo: '2026-06', monto: 22000, vencimiento: '2026-06-05', fecha_pago: '2026-06-03', estado: 'pagado', monto_confirmado: true, observacion: null, cargas: [], created_at: ahora, servicios: servResumen('srv-coch') },
  // Nafta (acumulable): varias cargas en el mes; el monto es la suma y se da por pagada.
  { id: 'g-naf6', user_id: 'demo', servicio_id: 'srv-naf', periodo: '2026-06', monto: 45000, vencimiento: null, fecha_pago: '2026-06-27', estado: 'pagado', monto_confirmado: true, observacion: null, cargas: [{ monto: 15000, fecha: '2026-06-02' }, { monto: 12000, fecha: '2026-06-14' }, { monto: 18000, fecha: '2026-06-27' }], created_at: ahora, servicios: servResumen('srv-naf') },
  // Período anterior (2026-05) — para el gráfico de evolución
  { id: 'g9', user_id: 'demo', servicio_id: 'srv-luz', periodo: '2026-05', monto: 49000, vencimiento: '2026-05-05', fecha_pago: '2026-05-04', estado: 'pagado', monto_confirmado: true, observacion: null, cargas: [], created_at: ahora, servicios: servResumen('srv-luz') },
  { id: 'g10', user_id: 'demo', servicio_id: 'srv-exp', periodo: '2026-05', monto: 36500, vencimiento: '2026-05-10', fecha_pago: '2026-05-08', estado: 'pagado', monto_confirmado: true, observacion: null, cargas: [], created_at: ahora, servicios: servResumen('srv-exp') },
  { id: 'g11', user_id: 'demo', servicio_id: 'srv-gas', periodo: '2026-05', monto: 19800, vencimiento: '2026-05-18', fecha_pago: '2026-05-22', estado: 'pagado', monto_confirmado: true, observacion: null, cargas: [], created_at: ahora, servicios: servResumen('srv-gas') },
  { id: 'g12', user_id: 'demo', servicio_id: 'srv-imp', periodo: '2026-05', monto: 13900, vencimiento: '2026-05-22', fecha_pago: '2026-05-20', estado: 'pagado', monto_confirmado: true, observacion: null, cargas: [], created_at: ahora, servicios: servResumen('srv-imp') },
  { id: 'g13', user_id: 'demo', servicio_id: 'srv-gim', periodo: '2026-05', monto: 25000, vencimiento: '2026-05-01', fecha_pago: '2026-05-02', estado: 'pagado', monto_confirmado: true, observacion: null, cargas: [], created_at: ahora, servicios: servResumen('srv-gim') },
  { id: 'g14', user_id: 'demo', servicio_id: 'srv-agua', periodo: '2026-05', monto: 11800, vencimiento: '2026-05-12', fecha_pago: '2026-05-11', estado: 'pagado', monto_confirmado: true, observacion: null, cargas: [], created_at: ahora, servicios: servResumen('srv-agua') },
  { id: 'g-naf5', user_id: 'demo', servicio_id: 'srv-naf', periodo: '2026-05', monto: 30000, vencimiento: null, fecha_pago: '2026-05-20', estado: 'pagado', monto_confirmado: true, observacion: null, cargas: [{ monto: 14000, fecha: '2026-05-05' }, { monto: 16000, fecha: '2026-05-20' }], created_at: ahora, servicios: servResumen('srv-naf') },
  // Dos meses atrás (2026-04)
  { id: 'g15', user_id: 'demo', servicio_id: 'srv-luz', periodo: '2026-04', monto: 41200, vencimiento: '2026-04-05', fecha_pago: '2026-04-05', estado: 'pagado', monto_confirmado: true, observacion: null, cargas: [], created_at: ahora, servicios: servResumen('srv-luz') },
  { id: 'g16', user_id: 'demo', servicio_id: 'srv-exp', periodo: '2026-04', monto: 34000, vencimiento: '2026-04-10', fecha_pago: '2026-04-09', estado: 'pagado', monto_confirmado: true, observacion: null, cargas: [], created_at: ahora, servicios: servResumen('srv-exp') },
  { id: 'g17', user_id: 'demo', servicio_id: 'srv-gas', periodo: '2026-04', monto: 24600, vencimiento: '2026-04-18', fecha_pago: '2026-04-16', estado: 'pagado', monto_confirmado: true, observacion: null, cargas: [], created_at: ahora, servicios: servResumen('srv-gas') },
  { id: 'g18', user_id: 'demo', servicio_id: 'srv-gim', periodo: '2026-04', monto: 23000, vencimiento: '2026-04-01', fecha_pago: '2026-04-02', estado: 'pagado', monto_confirmado: true, observacion: null, cargas: [], created_at: ahora, servicios: servResumen('srv-gim') },
  { id: 'g-naf4', user_id: 'demo', servicio_id: 'srv-naf', periodo: '2026-04', monto: 13000, vencimiento: null, fecha_pago: '2026-04-10', estado: 'pagado', monto_confirmado: true, observacion: null, cargas: [{ monto: 13000, fecha: '2026-04-10' }], created_at: ahora, servicios: servResumen('srv-naf') },
  // Ingresos (Trabajo) — período actual y anteriores para el gráfico
  { id: 'ing-s6', user_id: 'demo', servicio_id: 'srv-sueldo', periodo: '2026-06', monto: 1200000, vencimiento: null, fecha_pago: '2026-06-05', estado: 'pagado', monto_confirmado: true, observacion: null, cargas: [], created_at: ahora, servicios: servResumen('srv-sueldo') },
  { id: 'ing-f6', user_id: 'demo', servicio_id: 'srv-freelance', periodo: '2026-06', monto: 630000, vencimiento: null, fecha_pago: '2026-06-18', estado: 'pagado', monto_confirmado: true, observacion: null, cargas: [{ monto: 350000, fecha: '2026-06-10' }, { monto: 280000, fecha: '2026-06-18' }], created_at: ahora, servicios: servResumen('srv-freelance') },
  { id: 'ing-s5', user_id: 'demo', servicio_id: 'srv-sueldo', periodo: '2026-05', monto: 1200000, vencimiento: null, fecha_pago: '2026-05-06', estado: 'pagado', monto_confirmado: true, observacion: null, cargas: [], created_at: ahora, servicios: servResumen('srv-sueldo') },
  { id: 'ing-f5', user_id: 'demo', servicio_id: 'srv-freelance', periodo: '2026-05', monto: 180000, vencimiento: null, fecha_pago: '2026-05-22', estado: 'pagado', monto_confirmado: true, observacion: null, cargas: [{ monto: 180000, fecha: '2026-05-22' }], created_at: ahora, servicios: servResumen('srv-freelance') },
  { id: 'ing-s4', user_id: 'demo', servicio_id: 'srv-sueldo', periodo: '2026-04', monto: 1100000, vencimiento: null, fecha_pago: '2026-04-05', estado: 'pagado', monto_confirmado: true, observacion: null, cargas: [], created_at: ahora, servicios: servResumen('srv-sueldo') },
];
