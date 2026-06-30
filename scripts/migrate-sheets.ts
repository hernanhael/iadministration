/**
 * Migración única: importa historial de Google Sheets (2024–2026)
 * a las tablas planillas / servicios / gastos de Supabase.
 *
 * Ejecutar con:  npx tsx scripts/migrate-sheets.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const USER_ID = process.env.MIGRATION_USER_ID! // ID del usuario en auth.users

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// ─── Definición de planillas ─────────────────────────────────────────────────

const PLANILLAS_DEF = [
  {
    key: 'inmueble',
    nombre: 'Inmueble',
    detalle: 'Nicolás Av. 632, 4A, San Miguel de Tucumán',
    tipo: 'egreso',
    color: '#5F5E5A',
  },
  {
    key: 'cochera',
    nombre: 'Cochera N° 10',
    detalle: 'Nicolás Avellaneda 632, San Miguel de Tucumán',
    tipo: 'egreso',
    color: '#5F5E5A',
  },
] as const

// ─── Definición de servicios por planilla ────────────────────────────────────

type ServicioDef = {
  nombre: string
  empresa: string | null
  nro_cliente: string | null
  url_pago: string | null
  dia_vencimiento: number | null
}

const SERVICIOS_DEF: Record<'inmueble' | 'cochera', ServicioDef[]> = {
  inmueble: [
    { nombre: 'Agua', empresa: 'SAT SAPEM', nro_cliente: '16847638', url_pago: 'https://www.aguasdeltucuman.com.ar/', dia_vencimiento: 10 },
    { nombre: 'Contribución Inmobiliaria de Servicios Integrados', empresa: 'Municipalidad de San Miguel', nro_cliente: '622.641', url_pago: 'https://www.dimsmt.gob.ar/', dia_vencimiento: null },
    { nombre: 'Electricidad', empresa: 'EDET SA', nro_cliente: '619424', url_pago: 'https://www.edetsa.com/', dia_vencimiento: null },
    { nombre: 'Expensas', empresa: 'CP Av. Nicolás Avellaneda 632', nro_cliente: null, url_pago: null, dia_vencimiento: 10 },
    { nombre: 'Expensas Extraordinarias', empresa: 'CP Av. Nicolás Avellaneda 632', nro_cliente: null, url_pago: null, dia_vencimiento: null },
    { nombre: 'Gas', empresa: 'Naturgy', nro_cliente: '41415957', url_pago: 'https://www.naturgynoa.com.ar/', dia_vencimiento: null },
    { nombre: 'Internet', empresa: 'Claro SA', nro_cliente: '21714291281', url_pago: 'https://www.claro.com.ar/', dia_vencimiento: 1 },
    { nombre: 'Impuesto Inmobiliario', empresa: 'Estado Provincial', nro_cliente: '604.703', url_pago: 'https://www.rentastucuman.gob.ar/nomina/rentastuc2/nwboletasweb/index_inmo.php', dia_vencimiento: null },
  ],
  cochera: [
    { nombre: 'Agua', empresa: 'SAT SAPEM', nro_cliente: '16847621', url_pago: 'https://www.aguasdeltucuman.com.ar/', dia_vencimiento: 10 },
    { nombre: 'Contribución Inmobiliaria de Servicios Integrados', empresa: 'Municipalidad de San Miguel', nro_cliente: '622.624', url_pago: 'https://www.dimsmt.gob.ar/', dia_vencimiento: null },
    { nombre: 'Expensas', empresa: 'CP Av. Nicolás Avellaneda 632', nro_cliente: null, url_pago: null, dia_vencimiento: 10 },
    { nombre: 'Expensas Extraordinarias', empresa: 'CP Av. Nicolás Avellaneda 632', nro_cliente: null, url_pago: null, dia_vencimiento: null },
    { nombre: 'Impuesto Inmobiliario', empresa: 'Estado Provincial', nro_cliente: '604.686', url_pago: 'https://www.rentastucuman.gob.ar/nomina/rentastuc2/nwboletasweb/index_inmo.php', dia_vencimiento: null },
  ],
}

// ─── Datos históricos de gastos ───────────────────────────────────────────────
// Regla aplicada: se omiten filas con monto=0 y sin fecha_pago (meses vacíos/futuros).
// Fechas en formato ISO YYYY-MM-DD.

type GastoRow = { servicio: string; monto: number; venc: string | null; pago: string | null; obs: string | null }
type PeriodoData = { periodo: string; inmueble: GastoRow[]; cochera: GastoRow[] }

const DATA: PeriodoData[] = [
  // ── 2024-05 ──────────────────────────────────────────────────────────────────
  {
    periodo: '2024-05',
    inmueble: [
      { servicio: 'Expensas', monto: 68110, venc: null, pago: null, obs: null },
      { servicio: 'Expensas Extraordinarias', monto: 33480, venc: null, pago: null, obs: null },
      { servicio: 'Gas', monto: 2965.65, venc: null, pago: null, obs: 'Controlar que el monto adeudado se transfiera a la nueva titularidad.' },
    ],
    cochera: [
      { servicio: 'Expensas', monto: 12663, venc: null, pago: null, obs: null },
      { servicio: 'Expensas Extraordinarias', monto: 6226, venc: null, pago: null, obs: null },
    ],
  },

  // ── 2024-07 ──────────────────────────────────────────────────────────────────
  {
    periodo: '2024-07',
    inmueble: [
      { servicio: 'Agua', monto: 41111.07, venc: null, pago: '2024-07-11', obs: 'Se pagaron deudas acumuladas.' },
      { servicio: 'Contribución Inmobiliaria de Servicios Integrados', monto: 14790.13, venc: null, pago: '2024-07-10', obs: 'Se pagaron deudas acumuladas.' },
      { servicio: 'Electricidad', monto: 22130, venc: '2024-07-22', pago: '2024-07-19', obs: 'Se cambió la titularidad, confirmación 11/07/2024.' },
      { servicio: 'Expensas', monto: 77250, venc: '2024-07-10', pago: '2024-07-08', obs: null },
      { servicio: 'Gas', monto: 3099.82, venc: '2024-07-25', pago: '2024-07-18', obs: 'Controlar que el monto adeudado se transfiera a la nueva titularidad.' },
      { servicio: 'Internet', monto: 0.10, venc: null, pago: '2024-07-01', obs: 'Pagar a través de ClaroPay, 15% de descuento.' },
    ],
    cochera: [
      { servicio: 'Agua', monto: 99617.33, venc: null, pago: '2024-07-11', obs: 'Se pagaron deudas acumuladas.' },
      { servicio: 'Contribución Inmobiliaria de Servicios Integrados', monto: 21190.19, venc: null, pago: '2024-07-16', obs: 'Se pagaron deudas acumuladas.' },
      { servicio: 'Expensas', monto: 14363, venc: '2024-07-10', pago: '2024-07-08', obs: null },
    ],
  },

  // ── 2024-08 ──────────────────────────────────────────────────────────────────
  {
    periodo: '2024-08',
    inmueble: [
      { servicio: 'Agua', monto: 8568.89, venc: '2024-08-09', pago: '2024-08-11', obs: null },
      { servicio: 'Expensas', monto: 72810, venc: '2024-08-12', pago: '2024-08-12', obs: null },
      { servicio: 'Gas', monto: 21278.39, venc: '2024-08-20', pago: '2024-08-21', obs: null },
      { servicio: 'Internet', monto: 13998.77, venc: '2024-08-01', pago: '2024-07-31', obs: '15% CB ($1.000).' },
    ],
    cochera: [
      { servicio: 'Agua', monto: 4881.18, venc: '2024-08-09', pago: '2024-08-11', obs: null },
      { servicio: 'Contribución Inmobiliaria de Servicios Integrados', monto: 586.09, venc: '2024-08-12', pago: '2024-08-11', obs: null },
      { servicio: 'Expensas', monto: 13538, venc: '2024-08-12', pago: '2024-08-12', obs: null },
    ],
  },

  // ── 2024-09 ──────────────────────────────────────────────────────────────────
  {
    periodo: '2024-09',
    inmueble: [
      { servicio: 'Agua', monto: 8440.28, venc: '2024-09-10', pago: '2024-09-11', obs: null },
      { servicio: 'Electricidad', monto: 18870, venc: '2024-09-23', pago: '2024-09-23', obs: null },
      { servicio: 'Expensas', monto: 84760, venc: '2024-09-12', pago: '2024-09-11', obs: null },
      { servicio: 'Gas', monto: 4439.51, venc: '2024-09-17', pago: '2024-09-11', obs: null },
      { servicio: 'Internet', monto: 13998.76, venc: '2024-09-02', pago: '2024-09-02', obs: 'Pagar a través de ClaroPay, 15% de descuento.' },
    ],
    cochera: [
      { servicio: 'Agua', monto: 4583.51, venc: '2024-09-10', pago: '2024-09-11', obs: null },
      { servicio: 'Contribución Inmobiliaria de Servicios Integrados', monto: 586.09, venc: '2024-09-10', pago: '2024-09-11', obs: null },
      { servicio: 'Expensas', monto: 15759, venc: '2024-09-12', pago: '2024-09-11', obs: null },
    ],
  },

  // ── 2024-10 ──────────────────────────────────────────────────────────────────
  {
    periodo: '2024-10',
    inmueble: [
      { servicio: 'Expensas', monto: 95620, venc: '2024-10-10', pago: '2024-10-09', obs: null },
      { servicio: 'Gas', monto: 6940.19, venc: '2024-10-16', pago: '2024-10-25', obs: 'Pagó Block Espacios con mora.' },
      { servicio: 'Internet', monto: 13998.76, venc: '2024-10-01', pago: '2024-10-01', obs: 'Pagar a través de ClaroPay, 15% de descuento.' },
    ],
    cochera: [
      { servicio: 'Contribución Inmobiliaria de Servicios Integrados', monto: 586.09, venc: '2024-10-10', pago: '2024-10-09', obs: null },
      { servicio: 'Expensas', monto: 17779, venc: '2024-10-10', pago: '2024-10-10', obs: null },
    ],
  },

  // ── 2024-11 ──────────────────────────────────────────────────────────────────
  {
    periodo: '2024-11',
    inmueble: [
      { servicio: 'Agua', monto: 14613.54, venc: '2024-11-11', pago: '2024-11-11', obs: 'Figura deuda del período del 07/2024.' },
      { servicio: 'Electricidad', monto: 58850, venc: '2024-11-19', pago: null, obs: null },
      { servicio: 'Expensas', monto: 115920, venc: '2024-11-12', pago: null, obs: null },
      { servicio: 'Gas', monto: 6891.01, venc: '2024-11-19', pago: '2024-11-11', obs: null },
      { servicio: 'Internet', monto: 14068.75, venc: '2024-11-01', pago: '2024-11-15', obs: 'Pagar a través de ClaroPay, 15% de descuento.' },
    ],
    cochera: [
      { servicio: 'Agua', monto: 7989.58, venc: '2024-11-11', pago: null, obs: 'Figura deuda del período del 08/2024.' },
      { servicio: 'Contribución Inmobiliaria de Servicios Integrados', monto: 586.09, venc: '2024-11-18', pago: null, obs: null },
      { servicio: 'Expensas', monto: 21554, venc: '2024-11-12', pago: null, obs: null },
    ],
  },

  // ── 2025-01 ──────────────────────────────────────────────────────────────────
  {
    periodo: '2025-01',
    inmueble: [
      { servicio: 'Contribución Inmobiliaria de Servicios Integrados', monto: 62095.63, venc: '2025-01-17', pago: '2025-01-10', obs: 'Se pagó todo el año.' },
      { servicio: 'Electricidad', monto: 58480, venc: '2025-01-21', pago: '2025-01-23', obs: null },
      { servicio: 'Expensas', monto: 139970, venc: '2025-01-10', pago: '2025-01-10', obs: null },
      { servicio: 'Gas', monto: 8509.17, venc: '2025-01-20', pago: '2025-01-20', obs: null },
      { servicio: 'Internet', monto: 15025.50, venc: '2025-01-02', pago: '2025-01-10', obs: 'Pagar a través de ClaroPay, 15% de descuento.' },
      { servicio: 'Impuesto Inmobiliario', monto: 35170.82, venc: '2025-01-17', pago: '2025-01-10', obs: 'Se pagó todo el año. Además se pagó dos veces, por lo que el año 2026 también estaría cubierto.' },
    ],
    cochera: [
      { servicio: 'Agua', monto: 7766.13, venc: '2025-01-10', pago: '2025-01-10', obs: null },
      { servicio: 'Contribución Inmobiliaria de Servicios Integrados', monto: 11238.91, venc: '2025-01-17', pago: '2025-01-10', obs: 'Se pagó todo el año.' },
      { servicio: 'Expensas', monto: 26025, venc: '2025-01-10', pago: '2025-01-10', obs: null },
      { servicio: 'Impuesto Inmobiliario', monto: 9000, venc: '2025-01-17', pago: '2025-01-10', obs: 'Se pagó todo el año. Además se pagó dos veces por lo que el 2026 estaría también abonado.' },
    ],
  },

  // ── 2025-02 ──────────────────────────────────────────────────────────────────
  {
    periodo: '2025-02',
    inmueble: [
      { servicio: 'Agua', monto: 14278.57, venc: '2025-02-10', pago: '2025-02-10', obs: null },
      { servicio: 'Expensas', monto: 131730, venc: '2025-02-10', pago: '2025-02-11', obs: null },
      { servicio: 'Gas', monto: 7700.23, venc: '2025-02-21', pago: '2025-02-28', obs: null },
      { servicio: 'Internet', monto: 12030.50, venc: '2025-02-03', pago: '2025-02-04', obs: 'Pagar a través de ClaroPay, 15% de descuento.' },
    ],
    cochera: [
      { servicio: 'Agua', monto: 7766.13, venc: '2025-02-10', pago: '2025-02-10', obs: null },
      { servicio: 'Expensas', monto: 24493, venc: '2025-02-10', pago: '2025-02-11', obs: null },
    ],
  },

  // ── 2025-03 ──────────────────────────────────────────────────────────────────
  {
    periodo: '2025-03',
    inmueble: [
      { servicio: 'Agua', monto: 13632, venc: '2025-03-10', pago: '2025-03-09', obs: 'Figura deuda período 24/07/2024.' },
      { servicio: 'Electricidad', monto: 22690, venc: '2025-03-25', pago: '2025-03-26', obs: null },
      { servicio: 'Expensas', monto: 142180, venc: '2025-03-10', pago: '2025-03-10', obs: null },
      { servicio: 'Gas', monto: 7784.54, venc: '2025-03-25', pago: '2025-03-26', obs: null },
      { servicio: 'Internet', monto: 15899.75, venc: '2025-03-05', pago: '2025-03-09', obs: 'Pagar a través de ClaroPay, 15% de descuento.' },
    ],
    cochera: [
      { servicio: 'Agua', monto: 10161.98, venc: '2025-03-10', pago: '2025-03-09', obs: null },
      { servicio: 'Expensas', monto: 26436, venc: '2025-03-10', pago: '2025-03-10', obs: null },
    ],
  },

  // ── 2025-04 ──────────────────────────────────────────────────────────────────
  {
    periodo: '2025-04',
    inmueble: [
      { servicio: 'Agua', monto: 14278.57, venc: '2025-04-10', pago: '2025-04-10', obs: null },
      { servicio: 'Expensas', monto: 135110, venc: '2025-04-10', pago: '2025-04-10', obs: null },
      { servicio: 'Gas', monto: 6949.45, venc: '2025-04-28', pago: '2025-04-30', obs: null },
      { servicio: 'Internet', monto: 16348.50, venc: '2025-04-01', pago: '2025-04-05', obs: 'Pagar a través de ClaroPay, 15% de descuento.' },
    ],
    cochera: [
      { servicio: 'Agua', monto: 7766.13, venc: '2025-04-10', pago: '2025-04-10', obs: null },
      { servicio: 'Expensas', monto: 25121, venc: '2025-04-10', pago: '2025-04-10', obs: null },
    ],
  },

  // ── 2025-05 ──────────────────────────────────────────────────────────────────
  {
    periodo: '2025-05',
    inmueble: [
      { servicio: 'Agua', monto: 15941.58, venc: '2025-05-12', pago: '2025-05-12', obs: null },
      { servicio: 'Electricidad', monto: 15230, venc: '2025-05-23', pago: '2025-05-23', obs: null },
      { servicio: 'Expensas', monto: 134650, venc: '2025-05-10', pago: '2025-05-12', obs: null },
      { servicio: 'Gas', monto: 6964.96, venc: '2025-05-22', pago: '2025-05-23', obs: null },
      { servicio: 'Internet', monto: 16711, venc: '2025-05-05', pago: '2025-05-08', obs: 'Pagar a través de ClaroPay, 15% de descuento.' },
    ],
    cochera: [
      { servicio: 'Agua', monto: 8827.75, venc: '2025-05-12', pago: '2025-05-12', obs: null },
      { servicio: 'Expensas', monto: 25035, venc: '2025-05-10', pago: '2025-05-12', obs: null },
    ],
  },

  // ── 2025-06 ──────────────────────────────────────────────────────────────────
  {
    periodo: '2025-06',
    inmueble: [
      { servicio: 'Agua', monto: 17158.22, venc: '2025-06-10', pago: '2025-06-09', obs: null },
      { servicio: 'Expensas', monto: 183230, venc: '2025-06-10', pago: '2025-06-09', obs: null },
      { servicio: 'Gas', monto: 7277.77, venc: '2025-06-18', pago: '2025-07-02', obs: 'Se pagó en conjunto con julio.' },
      { servicio: 'Internet', monto: 17069.43, venc: '2025-06-02', pago: '2025-06-09', obs: 'Pagar a través de ClaroPay, 15% de descuento.' },
    ],
    cochera: [
      { servicio: 'Agua', monto: 9358.89, venc: '2025-06-10', pago: '2025-06-09', obs: null },
      { servicio: 'Expensas', monto: 34069, venc: '2025-06-10', pago: '2025-06-09', obs: null },
    ],
  },

  // ── 2025-07 ──────────────────────────────────────────────────────────────────
  {
    periodo: '2025-07',
    inmueble: [
      { servicio: 'Agua', monto: 16900.73, venc: '2025-07-10', pago: '2025-07-10', obs: null },
      { servicio: 'Electricidad', monto: 16070, venc: '2025-07-21', pago: '2025-07-24', obs: null },
      { servicio: 'Expensas', monto: 159980, venc: '2025-07-10', pago: '2025-07-10', obs: null },
      { servicio: 'Gas', monto: 7277.35, venc: '2025-07-16', pago: '2025-07-02', obs: 'Se pagó en conjunto con junio.' },
      { servicio: 'Internet', monto: 17464.80, venc: '2025-07-01', pago: '2025-07-05', obs: 'Pagar a través de ClaroPay, 15% de descuento.' },
    ],
    cochera: [
      { servicio: 'Agua', monto: 9358.87, venc: '2025-07-10', pago: '2025-07-10', obs: null },
      { servicio: 'Expensas', monto: 29745, venc: '2025-07-10', pago: '2025-07-10', obs: null },
    ],
  },

  // ── 2025-08 ──────────────────────────────────────────────────────────────────
  {
    periodo: '2025-08',
    inmueble: [
      { servicio: 'Agua', monto: 17158.22, venc: '2025-08-08', pago: '2025-08-10', obs: null },
      { servicio: 'Expensas', monto: 150140, venc: '2025-08-10', pago: '2025-08-10', obs: null },
      { servicio: 'Gas', monto: 4109.51, venc: '2025-08-18', pago: '2025-08-26', obs: null },
      { servicio: 'Internet', monto: 17871.63, venc: '2025-08-01', pago: '2025-08-08', obs: 'Pagar a través de ClaroPay, 15% de descuento.' },
    ],
    cochera: [
      { servicio: 'Agua', monto: 9358.89, venc: '2025-08-08', pago: '2025-08-10', obs: null },
      { servicio: 'Expensas', monto: 27915, venc: '2025-08-10', pago: '2025-08-10', obs: null },
    ],
  },

  // ── 2025-09 ──────────────────────────────────────────────────────────────────
  {
    periodo: '2025-09',
    inmueble: [
      { servicio: 'Agua', monto: 17158.22, venc: '2025-09-10', pago: '2025-09-10', obs: null },
      { servicio: 'Electricidad', monto: 19580, venc: '2025-09-18', pago: '2025-09-24', obs: null },
      { servicio: 'Expensas', monto: 155400, venc: '2025-09-10', pago: '2025-09-10', obs: null },
      { servicio: 'Gas', monto: 4412.62, venc: '2025-09-16', pago: '2025-09-24', obs: null },
      { servicio: 'Internet', monto: 18145.91, venc: '2025-09-01', pago: '2025-09-10', obs: 'Pagar a través de ClaroPay, 15% de descuento.' },
    ],
    cochera: [
      { servicio: 'Agua', monto: 9358.98, venc: '2025-09-10', pago: '2025-09-10', obs: null },
      { servicio: 'Expensas', monto: 28893, venc: '2025-09-10', pago: '2025-09-10', obs: null },
    ],
  },

  // ── 2025-10 ──────────────────────────────────────────────────────────────────
  {
    periodo: '2025-10',
    inmueble: [
      { servicio: 'Agua', monto: 16900, venc: '2025-10-10', pago: '2025-10-10', obs: null },
      { servicio: 'Expensas', monto: 163140, venc: '2025-10-10', pago: '2025-10-10', obs: null },
      { servicio: 'Gas', monto: 8906.85, venc: '2025-10-20', pago: '2025-11-01', obs: null },
      { servicio: 'Internet', monto: 18538.25, venc: '2025-10-01', pago: '2025-10-10', obs: 'Pagar a través de ClaroPay, 15% de descuento.' },
    ],
    cochera: [
      { servicio: 'Agua', monto: 9358.87, venc: '2025-10-10', pago: '2025-10-10', obs: null },
      { servicio: 'Expensas', monto: 30333, venc: '2025-10-10', pago: '2025-10-10', obs: null },
    ],
  },

  // ── 2025-11 ──────────────────────────────────────────────────────────────────
  {
    periodo: '2025-11',
    inmueble: [
      { servicio: 'Agua', monto: 17295.59, venc: '2025-11-10', pago: '2025-11-10', obs: null },
      { servicio: 'Electricidad', monto: 35010, venc: '2025-11-18', pago: '2025-11-25', obs: null },
      { servicio: 'Expensas', monto: 150030, venc: '2025-11-10', pago: '2025-11-10', obs: null },
      { servicio: 'Gas', monto: 8731.22, venc: '2025-11-17', pago: '2025-11-25', obs: null },
      { servicio: 'Internet', monto: 18815.11, venc: '2025-11-03', pago: '2025-11-08', obs: 'Pagar a través de ClaroPay, 15% de descuento.' },
    ],
    cochera: [
      { servicio: 'Agua', monto: 9433.82, venc: '2025-11-10', pago: '2025-11-10', obs: null },
      { servicio: 'Expensas', monto: 27894, venc: '2025-11-10', pago: '2025-11-10', obs: null },
    ],
  },

  // ── 2025-12 ──────────────────────────────────────────────────────────────────
  {
    periodo: '2025-12',
    inmueble: [
      { servicio: 'Agua', monto: 16900.73, venc: '2025-12-10', pago: '2025-12-10', obs: null },
      { servicio: 'Expensas', monto: 175980, venc: '2025-12-10', pago: '2025-12-10', obs: null },
      { servicio: 'Gas', monto: 10463.13, venc: '2025-12-17', pago: '2025-12-22', obs: null },
      { servicio: 'Internet', monto: 19107.10, venc: '2025-12-01', pago: '2025-12-04', obs: 'Pagar a través de ClaroPay, 15% de descuento.' },
    ],
    cochera: [
      { servicio: 'Agua', monto: 9358.89, venc: '2025-12-10', pago: '2025-12-10', obs: null },
      { servicio: 'Expensas', monto: 32720, venc: '2025-12-10', pago: '2025-12-10', obs: null },
    ],
  },

  // ── 2026-01 ──────────────────────────────────────────────────────────────────
  {
    periodo: '2026-01',
    inmueble: [
      { servicio: 'Agua', monto: 17158.22, venc: '2026-01-12', pago: '2026-01-12', obs: null },
      { servicio: 'Contribución Inmobiliaria de Servicios Integrados', monto: 62095.66, venc: null, pago: '2026-01-12', obs: 'Pagué todo el año.' },
      { servicio: 'Electricidad', monto: 44600, venc: '2026-01-20', pago: '2026-01-24', obs: null },
      { servicio: 'Expensas', monto: 164880, venc: '2026-01-12', pago: '2026-01-12', obs: null },
      { servicio: 'Gas', monto: 10753.23, venc: '2026-01-19', pago: '2026-01-24', obs: null },
      { servicio: 'Internet', monto: 27502.11, venc: '2026-01-02', pago: '2026-01-05', obs: 'Pagar con ClaroPay, 15% de descuento.' },
      { servicio: 'Impuesto Inmobiliario', monto: 45027.66, venc: null, pago: '2026-01-12', obs: 'Pagué todo el año.' },
    ],
    cochera: [
      { servicio: 'Agua', monto: 9358.89, venc: '2026-01-12', pago: '2026-01-12', obs: null },
      { servicio: 'Contribución Inmobiliaria de Servicios Integrados', monto: 12903, venc: null, pago: '2026-01-12', obs: 'Pagué todo el año.' },
      { servicio: 'Expensas', monto: 30655, venc: '2026-01-12', pago: '2026-01-12', obs: null },
      { servicio: 'Impuesto Inmobiliario', monto: 9600, venc: null, pago: '2026-01-12', obs: 'Pagué todo el año.' },
    ],
  },

  // ── 2026-02 ──────────────────────────────────────────────────────────────────
  {
    periodo: '2026-02',
    inmueble: [
      { servicio: 'Agua', monto: 17158.22, venc: '2026-02-10', pago: '2026-02-10', obs: null },
      { servicio: 'Expensas', monto: 195760, venc: '2026-02-10', pago: '2026-02-10', obs: null },
      { servicio: 'Gas', monto: 10925.33, venc: '2026-02-18', pago: '2026-02-21', obs: null },
      { servicio: 'Internet', monto: 20348.82, venc: '2026-02-12', pago: '2026-02-02', obs: 'Pagar con Claro Pay, 15% de descuento.' },
    ],
    cochera: [
      { servicio: 'Agua', monto: 9358.89, venc: '2026-02-10', pago: '2026-02-10', obs: null },
      { servicio: 'Expensas', monto: 36397, venc: '2026-02-10', pago: '2026-02-10', obs: null },
    ],
  },

  // ── 2026-03 ──────────────────────────────────────────────────────────────────
  {
    periodo: '2026-03',
    inmueble: [
      { servicio: 'Agua', monto: 18026.42, venc: '2026-03-10', pago: '2026-03-10', obs: null },
      { servicio: 'Electricidad', monto: 50430, venc: '2026-03-19', pago: '2026-03-30', obs: null },
      { servicio: 'Expensas', monto: 189650, venc: '2026-03-10', pago: '2026-03-10', obs: null },
      { servicio: 'Gas', monto: 10996.46, venc: '2026-03-30', pago: '2026-03-30', obs: null },
      { servicio: 'Internet', monto: 21264.51, venc: '2026-03-03', pago: '2026-03-04', obs: 'Pagar con Claro Pay, 20% de descuento.' },
    ],
    cochera: [
      { servicio: 'Agua', monto: 10361.24, venc: '2026-03-10', pago: '2026-03-10', obs: null },
      { servicio: 'Expensas', monto: 35261, venc: '2026-03-10', pago: '2026-03-10', obs: null },
    ],
  },

  // ── 2026-04 ──────────────────────────────────────────────────────────────────
  {
    periodo: '2026-04',
    inmueble: [
      { servicio: 'Agua', monto: 19380.04, venc: '2026-04-10', pago: '2026-04-09', obs: null },
      { servicio: 'Expensas', monto: 194229, venc: '2026-04-10', pago: '2026-04-09', obs: null },
      { servicio: 'Gas', monto: 10008, venc: '2026-04-14', pago: '2026-04-19', obs: null },
      { servicio: 'Internet', monto: 22015.19, venc: '2026-04-01', pago: '2026-04-06', obs: 'Pagar con Claro Pay, 20% de descuento.' },
    ],
    cochera: [
      { servicio: 'Agua', monto: 10634.84, venc: '2026-04-10', pago: '2026-04-09', obs: null },
      { servicio: 'Expensas', monto: 36110, venc: '2026-04-10', pago: '2026-04-09', obs: null },
    ],
  },

  // ── 2026-05 ──────────────────────────────────────────────────────────────────
  {
    periodo: '2026-05',
    inmueble: [
      { servicio: 'Agua', monto: 19090, venc: '2026-05-11', pago: '2026-05-11', obs: null },
      { servicio: 'Electricidad', monto: 43500, venc: '2026-05-19', pago: '2026-06-01', obs: null },
      { servicio: 'Expensas', monto: 200290, venc: '2026-05-11', pago: '2026-05-11', obs: null },
      { servicio: 'Gas', monto: 10683, venc: '2026-05-20', pago: '2026-05-23', obs: null },
      { servicio: 'Internet', monto: 22978, venc: '2026-05-04', pago: '2026-05-06', obs: 'Pagar con Claro Pay, 20% de descuento.' },
    ],
    cochera: [
      { servicio: 'Agua', monto: 10635, venc: '2026-05-11', pago: '2026-05-11', obs: null },
      { servicio: 'Expensas', monto: 37241, venc: '2026-05-11', pago: '2026-05-11', obs: null },
    ],
  },

  // ── 2026-06 ──────────────────────────────────────────────────────────────────
  {
    periodo: '2026-06',
    inmueble: [
      { servicio: 'Agua', monto: 19381, venc: '2026-06-10', pago: '2026-06-09', obs: null },
      { servicio: 'Expensas', monto: 190390, venc: '2026-06-10', pago: '2026-06-10', obs: null },
      { servicio: 'Gas', monto: 16064, venc: '2026-06-22', pago: '2026-06-29', obs: null },
      { servicio: 'Internet', monto: 24012, venc: '2026-06-01', pago: '2026-06-06', obs: 'Pagar con Claro Pay, 20% de descuento.' },
    ],
    cochera: [
      { servicio: 'Agua', monto: 10635, venc: '2026-06-10', pago: '2026-06-09', obs: null },
      { servicio: 'Expensas', monto: 35400, venc: '2026-06-10', pago: '2026-06-10', obs: null },
    ],
  },
]

// ─── Lógica de migración ──────────────────────────────────────────────────────

async function upsertPlanilla(key: 'inmueble' | 'cochera'): Promise<string> {
  const def = PLANILLAS_DEF.find((p) => p.key === key)!
  const { data: existing } = await supabase
    .from('planillas')
    .select('id')
    .eq('user_id', USER_ID)
    .eq('nombre', def.nombre)
    .eq('activo', true)
    .maybeSingle()

  if (existing) {
    console.log(`  ✓ Planilla "${def.nombre}" ya existe (${existing.id})`)
    return existing.id
  }

  const { data, error } = await supabase
    .from('planillas')
    .insert({ user_id: USER_ID, nombre: def.nombre, detalle: def.detalle, tipo: def.tipo, color: def.color })
    .select('id')
    .single()

  if (error) throw new Error(`Error creando planilla "${def.nombre}": ${error.message}`)
  console.log(`  + Planilla "${def.nombre}" creada (${data.id})`)
  return data.id
}

async function upsertServicio(planillaId: string, def: ServicioDef): Promise<string> {
  const { data: existing } = await supabase
    .from('servicios')
    .select('id')
    .eq('user_id', USER_ID)
    .eq('planilla_id', planillaId)
    .eq('nombre', def.nombre)
    .maybeSingle()

  if (existing) {
    console.log(`    ✓ Servicio "${def.nombre}" ya existe (${existing.id})`)
    return existing.id
  }

  const { data, error } = await supabase
    .from('servicios')
    .insert({
      user_id: USER_ID,
      planilla_id: planillaId,
      nombre: def.nombre,
      empresa: def.empresa,
      nro_cliente: def.nro_cliente,
      url_pago: def.url_pago,
      dia_vencimiento: def.dia_vencimiento,
      activo: true,
      acumulable: false,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Error creando servicio "${def.nombre}": ${error.message}`)
  console.log(`    + Servicio "${def.nombre}" creado (${data.id})`)
  return data.id
}

async function insertGasto(
  servicioId: string,
  periodo: string,
  row: GastoRow,
): Promise<void> {
  const estado = row.pago ? 'pagado' : 'pendiente'
  const { error } = await supabase.from('gastos').upsert(
    {
      user_id: USER_ID,
      servicio_id: servicioId,
      periodo,
      monto: row.monto,
      vencimiento: row.venc,
      fecha_pago: row.pago,
      estado,
      monto_confirmado: true,
      observacion: row.obs,
    },
    { onConflict: 'servicio_id,periodo', ignoreDuplicates: true },
  )
  if (error) throw new Error(`Error insertando gasto ${periodo}/${row.servicio}: ${error.message}`)
}

async function main() {
  console.log('=== Migración Google Sheets → Supabase ===\n')

  // 1. Crear/verificar planillas
  console.log('[ Planillas ]')
  const planillaIds: Record<'inmueble' | 'cochera', string> = {
    inmueble: await upsertPlanilla('inmueble'),
    cochera: await upsertPlanilla('cochera'),
  }

  // 2. Crear/verificar servicios y construir mapa nombre→id
  console.log('\n[ Servicios ]')
  const servicioMap: Record<'inmueble' | 'cochera', Map<string, string>> = {
    inmueble: new Map(),
    cochera: new Map(),
  }

  for (const key of ['inmueble', 'cochera'] as const) {
    console.log(`  ${key}:`)
    for (const def of SERVICIOS_DEF[key]) {
      const id = await upsertServicio(planillaIds[key], def)
      servicioMap[key].set(def.nombre, id)
    }
  }

  // 3. Insertar gastos
  console.log('\n[ Gastos ]')
  let inserted = 0
  let skipped = 0

  for (const { periodo, inmueble, cochera } of DATA) {
    console.log(`  ${periodo}`)

    for (const row of inmueble) {
      const id = servicioMap.inmueble.get(row.servicio)
      if (!id) { console.warn(`    ⚠ Servicio no encontrado: ${row.servicio} (inmueble)`); skipped++; continue }
      await insertGasto(id, periodo, row)
      inserted++
    }

    for (const row of cochera) {
      const id = servicioMap.cochera.get(row.servicio)
      if (!id) { console.warn(`    ⚠ Servicio no encontrado: ${row.servicio} (cochera)`); skipped++; continue }
      await insertGasto(id, periodo, row)
      inserted++
    }
  }

  console.log(`\n=== Listo: ${inserted} gastos procesados, ${skipped} omitidos ===`)
}

main().catch((e) => { console.error(e); process.exit(1) })
