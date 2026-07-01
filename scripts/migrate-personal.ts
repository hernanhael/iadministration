/**
 * Migración única: importa planilla "Personal" (egresos) e "Ingresos Mensuales" (ingresos)
 * desde Google Sheets (2024–2026) a Supabase.
 *
 * Excluidos de egresos: "Cochera del Departamento" y "Departamento" (van en planillas propias).
 * Ingresos: solo 2026 (único año con datos de ingresos en los sheets).
 *
 * Ejecutar con:  npx tsx scripts/migrate-personal.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const USER_ID = process.env.MIGRATION_USER_ID!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// ─── Planillas ────────────────────────────────────────────────────────────────

const PLANILLAS_DEF = [
  { key: 'personal', nombre: 'Personal', detalle: null, tipo: 'egreso', color: '#5F5E5A' },
  { key: 'ingresos', nombre: 'Ingresos Mensuales', detalle: null, tipo: 'ingreso', color: '#5F5E5A' },
] as const

// ─── Servicios ────────────────────────────────────────────────────────────────

type ServicioDef = {
  nombre: string
  empresa: string | null
  nro_cliente: string | null
  url_pago: string | null
  dia_vencimiento: number | null
  activo: boolean
}

const SERVICIOS_DEF: Record<'personal' | 'ingresos', ServicioDef[]> = {
  personal: [
    { nombre: 'Adelí',           empresa: null,                nro_cliente: null, url_pago: null, dia_vencimiento: null, activo: true  },
    { nombre: 'Apple Cloud',     empresa: 'Apple',             nro_cliente: null, url_pago: null, dia_vencimiento: 8,    activo: true  },
    { nombre: 'Apple Cloud 2',   empresa: 'Apple',             nro_cliente: null, url_pago: null, dia_vencimiento: 8,    activo: false },
    { nombre: 'ChatGPT/Claude',  empresa: 'OpenAI / Anthropic',nro_cliente: null, url_pago: null, dia_vencimiento: null, activo: true  },
    { nombre: 'Claro SA',        empresa: 'Claro SA',          nro_cliente: null, url_pago: 'https://www.claro.com.ar/', dia_vencimiento: null, activo: true },
    { nombre: 'Cochera Favito',  empresa: null,                nro_cliente: null, url_pago: null, dia_vencimiento: null, activo: true  },
    { nombre: 'Keepa',           empresa: 'Keepa',             nro_cliente: null, url_pago: null, dia_vencimiento: null, activo: false },
    { nombre: 'Las Cañas',       empresa: null,                nro_cliente: null, url_pago: null, dia_vencimiento: null, activo: true  },
    { nombre: 'Lion BV',         empresa: null,                nro_cliente: null, url_pago: null, dia_vencimiento: null, activo: true  },
    { nombre: 'ML Nivel 6',      empresa: 'MercadoLibre',      nro_cliente: null, url_pago: null, dia_vencimiento: null, activo: false },
    { nombre: 'Nafta',           empresa: null,                nro_cliente: null, url_pago: null, dia_vencimiento: null, activo: true  },
    { nombre: 'SanCor',          empresa: 'SanCor Salud',      nro_cliente: null, url_pago: null, dia_vencimiento: null, activo: false },
    { nombre: 'Spotify',         empresa: 'Spotify',           nro_cliente: null, url_pago: null, dia_vencimiento: null, activo: true  },
    { nombre: 'Swiss Medical',   empresa: 'Swiss Medical',     nro_cliente: null, url_pago: null, dia_vencimiento: null, activo: true  },
  ],
  ingresos: [
    { nombre: 'Cochera',    empresa: null, nro_cliente: null, url_pago: null, dia_vencimiento: null, activo: true },
    { nombre: 'Departamento', empresa: null, nro_cliente: null, url_pago: null, dia_vencimiento: null, activo: true },
    { nombre: 'Dividendos', empresa: null, nro_cliente: null, url_pago: null, dia_vencimiento: null, activo: true },
    { nombre: 'Intereses',  empresa: null, nro_cliente: null, url_pago: null, dia_vencimiento: null, activo: true },
    { nombre: 'Salario PJ', empresa: null, nro_cliente: null, url_pago: null, dia_vencimiento: null, activo: true },
  ],
}

// ─── Datos de gastos ──────────────────────────────────────────────────────────
// Regla: omitir monto=0 sin fecha. Fechas en ISO YYYY-MM-DD.
// "Cochera" en egresos 2024-2025 → mapeada a "Cochera Favito".
// "ChatGPT" → mapeada a "ChatGPT/Claude".
// "Apple Cloud" duplicada en un mes → segunda instancia es "Apple Cloud 2".

type GastoRow = { servicio: string; monto: number; pago: string | null; obs: string | null }
type PeriodoEgreso = { periodo: string; personal: GastoRow[] }
type PeriodoIngreso = { periodo: string; ingresos: GastoRow[] }

const EGRESOS: PeriodoEgreso[] = [
  // ── 2024-08 ─────────────────────────────────────────────────────────────────
  {
    periodo: '2024-08',
    personal: [
      { servicio: 'Adelí',          monto: 12000,    pago: '2024-08-12', obs: null },
      { servicio: 'Apple Cloud',    monto: 1532,     pago: '2024-08-10', obs: null },
      { servicio: 'Cochera Favito', monto: 20000,    pago: '2024-08-09', obs: null },
      { servicio: 'Las Cañas',      monto: 45000,    pago: '2024-08-14', obs: null },
      { servicio: 'Lion BV',        monto: 18000,    pago: '2024-08-20', obs: null },
      { servicio: 'Nafta',          monto: 46000,    pago: '2024-08-08', obs: null },
      { servicio: 'ML Nivel 6',     monto: 3999,     pago: '2024-08-10', obs: null },
      { servicio: 'Keepa',          monto: 29550.21, pago: '2024-08-10', obs: null },
      { servicio: 'SanCor',         monto: 95366,    pago: '2024-08-10', obs: null },
      { servicio: 'Spotify',        monto: 2199,     pago: '2024-08-10', obs: null },
    ],
  },
  // ── 2024-09 ─────────────────────────────────────────────────────────────────
  {
    periodo: '2024-09',
    personal: [
      { servicio: 'Adelí',          monto: 14000, pago: '2024-08-30', obs: 'Aumenté el monto este mes.' },
      { servicio: 'Apple Cloud',    monto: 1532,  pago: '2024-09-03', obs: null },
      { servicio: 'Cochera Favito', monto: 20000, pago: '2024-09-11', obs: null },
      { servicio: 'Las Cañas',      monto: 45000, pago: '2024-09-11', obs: null },
      { servicio: 'Lion BV',        monto: 18000, pago: '2024-09-20', obs: null },
      { servicio: 'Nafta',          monto: 45000, pago: '2024-08-30', obs: null },
      { servicio: 'ML Nivel 6',     monto: 3999,  pago: '2024-09-03', obs: null },
      { servicio: 'SanCor',         monto: 95366, pago: '2024-09-03', obs: 'Se dejó de pagar Keepa este mes.' },
      { servicio: 'Spotify',        monto: 2199,  pago: '2024-09-03', obs: null },
    ],
  },
  // ── 2024-10 ─────────────────────────────────────────────────────────────────
  {
    periodo: '2024-10',
    personal: [
      { servicio: 'Adelí',          monto: 15000,  pago: '2024-10-02', obs: null },
      { servicio: 'Apple Cloud',    monto: 1532,   pago: '2024-10-03', obs: null },
      { servicio: 'Cochera Favito', monto: 20000,  pago: '2024-10-07', obs: null },
      { servicio: 'Las Cañas',      monto: 48000,  pago: '2024-10-09', obs: null },
      { servicio: 'Lion BV',        monto: 20000,  pago: '2024-10-18', obs: null },
      { servicio: 'Nafta',          monto: 47000,  pago: '2024-10-09', obs: null },
      { servicio: 'ML Nivel 6',     monto: 3999,   pago: '2024-10-03', obs: null },
      { servicio: 'SanCor',         monto: 107604, pago: '2024-10-03', obs: null },
      { servicio: 'Spotify',        monto: 4199,   pago: '2024-10-03', obs: null },
    ],
  },
  // ── 2025-01 ─────────────────────────────────────────────────────────────────
  {
    periodo: '2025-01',
    personal: [
      { servicio: 'Adelí',          monto: 30000,  pago: '2025-01-01', obs: null },
      { servicio: 'Apple Cloud',    monto: 1100,   pago: '2025-01-08', obs: null },
      { servicio: 'Cochera Favito', monto: 24000,  pago: '2025-01-09', obs: null },
      { servicio: 'Claro SA',       monto: 3345,   pago: '2025-01-10', obs: 'Descuento del 15% porque se pagó con ClaroPay.' },
      { servicio: 'Lion BV',        monto: 45000,  pago: '2025-01-18', obs: null },
      { servicio: 'Nafta',          monto: 47000,  pago: '2025-01-01', obs: null },
      { servicio: 'ML Nivel 6',     monto: 5999,   pago: '2025-01-08', obs: null },
      { servicio: 'SanCor',         monto: 126690, pago: '2025-01-08', obs: null },
      { servicio: 'Spotify',        monto: 4199,   pago: '2025-01-08', obs: null },
    ],
  },
  // ── 2025-02 ─────────────────────────────────────────────────────────────────
  {
    periodo: '2025-02',
    personal: [
      { servicio: 'Adelí',          monto: 15000,  pago: '2025-02-06', obs: null },
      { servicio: 'Apple Cloud',    monto: 1040,   pago: '2025-02-06', obs: null },
      { servicio: 'Cochera Favito', monto: 24000,  pago: '2025-02-10', obs: null },
      { servicio: 'Claro SA',       monto: 3472.50,pago: '2025-02-04', obs: 'Descuento del 15% porque se pagó con ClaroPay.' },
      { servicio: 'Las Cañas',      monto: 65000,  pago: null,          obs: null },
      { servicio: 'Lion BV',        monto: 45000,  pago: '2025-02-17', obs: null },
      { servicio: 'Nafta',          monto: 101000, pago: '2025-02-05', obs: 'Pagos: 05/02 y 25/02.' },
      { servicio: 'ML Nivel 6',     monto: 7998.93,pago: '2025-02-06', obs: null },
      { servicio: 'SanCor',         monto: 130509, pago: '2025-02-06', obs: null },
      { servicio: 'Spotify',        monto: 4199,   pago: '2025-02-06', obs: null },
    ],
  },
  // ── 2025-03 ─────────────────────────────────────────────────────────────────
  {
    periodo: '2025-03',
    personal: [
      { servicio: 'Adelí',          monto: 18000,  pago: '2025-03-09', obs: null },
      { servicio: 'Apple Cloud',    monto: 1205,   pago: '2025-03-09', obs: null },
      { servicio: 'Cochera Favito', monto: 27500,  pago: '2025-03-12', obs: null },
      { servicio: 'Claro SA',       monto: 3594,   pago: '2025-03-05', obs: null },
      { servicio: 'Las Cañas',      monto: 70000,  pago: '2025-03-13', obs: null },
      { servicio: 'Lion BV',        monto: 50000,  pago: '2025-03-18', obs: null },
      { servicio: 'Nafta',          monto: 50000,  pago: '2025-03-20', obs: null },
      { servicio: 'ML Nivel 6',     monto: 7998,   pago: '2025-03-09', obs: null },
      { servicio: 'SanCor',         monto: 134722, pago: '2025-03-09', obs: null },
      { servicio: 'Spotify',        monto: 4199,   pago: '2025-03-09', obs: null },
    ],
  },
  // ── 2025-04 ─────────────────────────────────────────────────────────────────
  {
    periodo: '2025-04',
    personal: [
      { servicio: 'Adelí',          monto: 20000,  pago: '2025-04-06', obs: null },
      { servicio: 'Apple Cloud',    monto: 1300,   pago: '2025-04-08', obs: null },
      { servicio: 'Apple Cloud 2',  monto: 1300,   pago: '2025-04-08', obs: null },
      { servicio: 'Cochera Favito', monto: 27500,  pago: '2025-04-08', obs: null },
      { servicio: 'Claro SA',       monto: 3718.50,pago: '2025-04-05', obs: null },
      { servicio: 'Las Cañas',      monto: 80000,  pago: '2025-05-07', obs: 'Pagado en mayo.' },
      { servicio: 'Lion BV',        monto: 50000,  pago: '2025-04-21', obs: null },
      { servicio: 'Nafta',          monto: 53000,  pago: '2025-04-14', obs: null },
      { servicio: 'ML Nivel 6',     monto: 7998.93,pago: '2025-04-08', obs: null },
      { servicio: 'ChatGPT/Claude', monto: 26000,  pago: '2025-04-08', obs: null },
      { servicio: 'SanCor',         monto: 144789, pago: '2025-04-08', obs: null },
      { servicio: 'Spotify',        monto: 4199,   pago: '2025-04-08', obs: null },
    ],
  },
  // ── 2025-05 ─────────────────────────────────────────────────────────────────
  {
    periodo: '2025-05',
    personal: [
      { servicio: 'Adelí',          monto: 20000,  pago: '2025-05-08', obs: null },
      { servicio: 'Apple Cloud',    monto: 1200,   pago: '2025-05-08', obs: null },
      { servicio: 'Apple Cloud 2',  monto: 1200,   pago: '2025-05-08', obs: null },
      { servicio: 'Cochera Favito', monto: 27500,  pago: '2025-05-10', obs: null },
      { servicio: 'Claro SA',       monto: 3825,   pago: '2025-05-08', obs: null },
      { servicio: 'Las Cañas',      monto: 80000,  pago: '2025-05-11', obs: null },
      { servicio: 'Lion BV',        monto: 50000,  pago: '2025-05-21', obs: null },
      { servicio: 'Nafta',          monto: 99000,  pago: '2025-05-04', obs: 'PC: $47.000 - SC: $52.000' },
      { servicio: 'ML Nivel 6',     monto: 7998.93,pago: '2025-05-08', obs: null },
      { servicio: 'ChatGPT/Claude', monto: 24000,  pago: '2025-05-08', obs: null },
      { servicio: 'SanCor',         monto: 147470, pago: '2025-05-08', obs: null },
      { servicio: 'Spotify',        monto: 4199,   pago: '2025-05-08', obs: null },
    ],
  },
  // ── 2025-06 ─────────────────────────────────────────────────────────────────
  {
    periodo: '2025-06',
    personal: [
      { servicio: 'Adelí',          monto: 20000,  pago: '2025-06-09', obs: null },
      { servicio: 'Apple Cloud',    monto: 1155,   pago: '2025-06-09', obs: null },
      { servicio: 'Apple Cloud 2',  monto: 1155,   pago: '2025-06-09', obs: null },
      { servicio: 'Cochera Favito', monto: 27500,  pago: '2025-06-13', obs: null },
      { servicio: 'Claro SA',       monto: 3928.49,pago: '2025-06-09', obs: null },
      { servicio: 'Las Cañas',      monto: 70000,  pago: '2025-06-21', obs: null },
      { servicio: 'Lion BV',        monto: 55000,  pago: '2025-06-24', obs: null },
      { servicio: 'Nafta',          monto: 50550,  pago: '2025-06-12', obs: null },
      { servicio: 'ML Nivel 6',     monto: 7998.93,pago: '2025-06-09', obs: null },
      { servicio: 'ChatGPT/Claude', monto: 23100,  pago: '2025-06-09', obs: null },
      { servicio: 'SanCor',         monto: 151811, pago: '2025-06-09', obs: null },
      { servicio: 'Spotify',        monto: 4199,   pago: '2025-06-09', obs: null },
    ],
  },
  // ── 2025-07 ─────────────────────────────────────────────────────────────────
  {
    periodo: '2025-07',
    personal: [
      { servicio: 'Adelí',          monto: 20000,  pago: '2025-07-05', obs: null },
      { servicio: 'Apple Cloud',    monto: 1250,   pago: '2025-07-08', obs: null },
      { servicio: 'Apple Cloud 2',  monto: 1250,   pago: '2025-07-08', obs: null },
      { servicio: 'Cochera Favito', monto: 30000,  pago: '2025-07-05', obs: null },
      { servicio: 'Claro SA',       monto: 4081.51,pago: '2025-07-05', obs: null },
      { servicio: 'Las Cañas',      monto: 45350,  pago: '2025-07-24', obs: null },
      { servicio: 'Lion BV',        monto: 55000,  pago: '2025-07-25', obs: null },
      { servicio: 'Nafta',          monto: 53008,  pago: '2025-07-03', obs: null },
      { servicio: 'ML Nivel 6',     monto: 7998.93,pago: '2025-07-08', obs: null },
      { servicio: 'ChatGPT/Claude', monto: 25000,  pago: '2025-07-08', obs: null },
      { servicio: 'SanCor',         monto: 153254, pago: '2025-07-08', obs: null },
      { servicio: 'Spotify',        monto: 4199,   pago: '2025-07-08', obs: null },
    ],
  },
  // ── 2025-08 ─────────────────────────────────────────────────────────────────
  {
    periodo: '2025-08',
    personal: [
      { servicio: 'Adelí',          monto: 20000,  pago: '2025-08-08', obs: null },
      { servicio: 'Apple Cloud',    monto: 1350,   pago: '2025-08-08', obs: null },
      { servicio: 'Apple Cloud 2',  monto: 1350,   pago: '2025-08-08', obs: null },
      { servicio: 'Cochera Favito', monto: 30000,  pago: '2025-08-12', obs: null },
      { servicio: 'Claro SA',       monto: 4200,   pago: '2025-08-08', obs: null },
      { servicio: 'Las Cañas',      monto: 42648,  pago: '2025-08-16', obs: null },
      { servicio: 'Lion BV',        monto: 55000,  pago: '2025-08-26', obs: null },
      { servicio: 'Nafta',          monto: 113000, pago: '2025-08-01', obs: '1C: $57.000 - 2C: $56.000' },
      { servicio: 'ML Nivel 6',     monto: 8990,   pago: '2025-08-08', obs: null },
      { servicio: 'ChatGPT/Claude', monto: 27000,  pago: '2025-08-08', obs: null },
      { servicio: 'SanCor',         monto: 159537, pago: '2025-08-08', obs: null },
      { servicio: 'Spotify',        monto: 4199,   pago: '2025-08-08', obs: null },
    ],
  },
  // ── 2025-09 ─────────────────────────────────────────────────────────────────
  {
    periodo: '2025-09',
    personal: [
      { servicio: 'Adelí',          monto: 20000,  pago: '2025-09-09', obs: null },
      { servicio: 'Apple Cloud',    monto: 1390,   pago: '2025-09-10', obs: null },
      { servicio: 'Apple Cloud 2',  monto: 1390,   pago: '2025-09-10', obs: null },
      { servicio: 'Cochera Favito', monto: 30000,  pago: '2025-09-09', obs: null },
      { servicio: 'Claro SA',       monto: 4274.99,pago: '2025-09-10', obs: null },
      { servicio: 'Las Cañas',      monto: 43453,  pago: '2025-09-10', obs: null },
      { servicio: 'Lion BV',        monto: 60000,  pago: '2025-09-23', obs: null },
      { servicio: 'Nafta',          monto: 59000,  pago: '2025-09-13', obs: null },
      { servicio: 'ML Nivel 6',     monto: 8990,   pago: '2025-09-10', obs: null },
      { servicio: 'ChatGPT/Claude', monto: 27800,  pago: '2025-09-10', obs: null },
      { servicio: 'SanCor',         monto: 161769, pago: '2025-09-10', obs: null },
      { servicio: 'Spotify',        monto: 4199,   pago: '2025-09-10', obs: null },
    ],
  },
  // ── 2025-10 ─────────────────────────────────────────────────────────────────
  {
    periodo: '2025-10',
    personal: [
      { servicio: 'Adelí',          monto: 20000,  pago: '2025-10-05', obs: null },
      { servicio: 'Apple Cloud',    monto: 1425,   pago: '2025-10-08', obs: null },
      { servicio: 'Cochera Favito', monto: 30000,  pago: '2025-10-10', obs: null },
      { servicio: 'Claro SA',       monto: 4386,   pago: '2025-11-01', obs: 'Pagado en noviembre.' },
      { servicio: 'Las Cañas',      monto: 44277,  pago: '2025-10-08', obs: null },
      { servicio: 'Lion BV',        monto: 60000,  pago: '2025-10-27', obs: null },
      { servicio: 'Nafta',          monto: 62000,  pago: '2025-10-03', obs: null },
      { servicio: 'ML Nivel 6',     monto: 8990,   pago: '2025-10-08', obs: null },
      { servicio: 'ChatGPT/Claude', monto: 28500,  pago: '2025-10-08', obs: null },
      { servicio: 'SanCor',         monto: 164462, pago: '2025-10-08', obs: null },
      { servicio: 'Spotify',        monto: 4199,   pago: '2025-10-08', obs: null },
    ],
  },
  // ── 2025-11 ─────────────────────────────────────────────────────────────────
  {
    periodo: '2025-11',
    personal: [
      { servicio: 'Adelí',          monto: 20000,  pago: '2025-11-10', obs: null },
      { servicio: 'Apple Cloud',    monto: 1405,   pago: '2025-11-10', obs: null },
      { servicio: 'Claro SA',       monto: 4468.50,pago: '2025-11-08', obs: null },
      { servicio: 'Cochera Favito', monto: 32500,  pago: '2025-11-10', obs: null },
      { servicio: 'Las Cañas',      monto: 45210,  pago: '2025-11-05', obs: null },
      { servicio: 'Lion BV',        monto: 65000,  pago: '2025-11-25', obs: null },
      { servicio: 'Nafta',          monto: 67000,  pago: '2025-11-30', obs: null },
      { servicio: 'ML Nivel 6',     monto: 8990,   pago: '2025-11-10', obs: null },
      { servicio: 'ChatGPT/Claude', monto: 29100,  pago: '2025-11-10', obs: null },
      { servicio: 'SanCor',         monto: 166921, pago: '2025-11-10', obs: null },
      { servicio: 'Spotify',        monto: 5499,   pago: '2025-11-10', obs: null },
    ],
  },
  // ── 2025-12 ─────────────────────────────────────────────────────────────────
  {
    periodo: '2025-12',
    personal: [
      { servicio: 'Adelí',          monto: 30000,  pago: '2025-12-05', obs: null },
      { servicio: 'Apple Cloud',    monto: 1500,   pago: '2025-12-09', obs: null },
      { servicio: 'Cochera Favito', monto: 32500,  pago: '2025-12-09', obs: null },
      { servicio: 'Lion BV',        monto: 65000,  pago: '2025-12-24', obs: null },
      { servicio: 'ML Nivel 6',     monto: 8990,   pago: '2025-12-09', obs: null },
      { servicio: 'ChatGPT/Claude', monto: 30000,  pago: '2025-12-09', obs: null },
      { servicio: 'SanCor',         monto: 170006, pago: '2025-12-09', obs: null },
      { servicio: 'Spotify',        monto: 5499,   pago: '2025-12-09', obs: null },
    ],
  },
  // ── 2026-01 ─────────────────────────────────────────────────────────────────
  {
    periodo: '2026-01',
    personal: [
      { servicio: 'Adelí',          monto: 20000,  pago: '2026-02-02', obs: 'Pagado en febrero.' },
      { servicio: 'Apple Cloud',    monto: 1450,   pago: '2026-01-12', obs: null },
      { servicio: 'ChatGPT/Claude', monto: 29000,  pago: '2026-01-12', obs: null },
      { servicio: 'Claro SA',       monto: 9336,   pago: '2026-01-01', obs: 'Pagar con ClaroPay, 15% de descuento.' },
      { servicio: 'Cochera Favito', monto: 32500,  pago: '2026-01-14', obs: null },
      { servicio: 'Lion BV',        monto: 65000,  pago: '2026-01-12', obs: null },
      { servicio: 'Nafta',          monto: 97000,  pago: null,          obs: '1C: 07/01 - 2C: 19/01 - 3C: 23/01 - 4C: 27/01' },
      { servicio: 'SanCor',         monto: 173455, pago: '2026-01-12', obs: null },
      { servicio: 'Spotify',        monto: 5499,   pago: '2026-01-12', obs: null },
    ],
  },
  // ── 2026-02 ─────────────────────────────────────────────────────────────────
  {
    periodo: '2026-02',
    personal: [
      { servicio: 'Adelí',          monto: 20000,  pago: '2026-01-02', obs: null },
      { servicio: 'Apple Cloud',    monto: 1500,   pago: '2026-02-10', obs: null },
      { servicio: 'ChatGPT/Claude', monto: 31000,  pago: '2026-02-10', obs: null },
      { servicio: 'Claro SA',       monto: 9699,   pago: '2026-02-02', obs: 'Pagar con ClaroPay, 15% de descuento.' },
      { servicio: 'Cochera Favito', monto: 37500,  pago: '2026-02-10', obs: null },
      { servicio: 'Las Cañas',      monto: 56250,  pago: '2026-02-12', obs: null },
      { servicio: 'Nafta',          monto: 60000,  pago: '2026-02-19', obs: null },
      { servicio: 'SanCor',         monto: 179841, pago: '2026-02-10', obs: null },
      { servicio: 'Spotify',        monto: 5499,   pago: '2026-02-10', obs: null },
    ],
  },
  // ── 2026-03 ─────────────────────────────────────────────────────────────────
  {
    periodo: '2026-03',
    personal: [
      { servicio: 'Adelí',          monto: 25000,     pago: '2026-03-04', obs: null },
      { servicio: 'Apple Cloud',    monto: 1450,      pago: '2026-03-10', obs: null },
      { servicio: 'ChatGPT/Claude', monto: 31000,     pago: '2026-03-10', obs: null },
      { servicio: 'Claro SA',       monto: 16689.01,  pago: '2026-03-03', obs: 'Pagar con ClaroPay, 15% de descuento.' },
      { servicio: 'Cochera Favito', monto: 37500,     pago: '2026-03-09', obs: null },
      { servicio: 'Las Cañas',      monto: 52941.18,  pago: '2026-03-09', obs: null },
      { servicio: 'Lion BV',        monto: 65000,     pago: '2026-03-09', obs: null },
      { servicio: 'Nafta',          monto: 75000,     pago: '2026-03-12', obs: null },
      { servicio: 'SanCor',         monto: 184244,    pago: '2026-03-10', obs: null },
      { servicio: 'Spotify',        monto: 5499,      pago: '2026-03-10', obs: null },
    ],
  },
  // ── 2026-04 ─────────────────────────────────────────────────────────────────
  {
    periodo: '2026-04',
    personal: [
      { servicio: 'Adelí',          monto: 30000,    pago: '2026-04-05', obs: null },
      { servicio: 'Apple Cloud',    monto: 1415,     pago: '2026-04-09', obs: null },
      { servicio: 'ChatGPT/Claude', monto: 56600,    pago: '2026-04-09', obs: null },
      { servicio: 'Claro SA',       monto: 10539.01, pago: '2026-04-06', obs: 'Pagar con ClaroPay, 15% de descuento.' },
      { servicio: 'Cochera Favito', monto: 37500,    pago: '2026-04-09', obs: null },
      { servicio: 'Las Cañas',      monto: 48596,    pago: '2026-04-09', obs: null },
      { servicio: 'Lion BV',        monto: 65000,    pago: '2026-04-09', obs: null },
      { servicio: 'Nafta',          monto: 150000,   pago: '2026-04-01', obs: null },
      { servicio: 'SanCor',         monto: 189587,   pago: '2026-04-09', obs: null },
      { servicio: 'Spotify',        monto: 5499,     pago: '2026-04-09', obs: null },
    ],
  },
  // ── 2026-05 ─────────────────────────────────────────────────────────────────
  {
    periodo: '2026-05',
    personal: [
      { servicio: 'Adelí',          monto: 30000,     pago: '2026-05-06', obs: null },
      { servicio: 'Apple Cloud',    monto: 1420,      pago: '2026-05-11', obs: null },
      { servicio: 'ChatGPT/Claude', monto: 62480,     pago: '2026-05-11', obs: null },
      { servicio: 'Claro SA',       monto: 10949,     pago: '2026-05-06', obs: 'Pagar con ClaroPay, 15% de descuento.' },
      { servicio: 'Cochera Favito', monto: 37500,     pago: '2026-05-11', obs: null },
      { servicio: 'Las Cañas',      monto: 56318,     pago: '2026-05-06', obs: null },
      { servicio: 'Lion BV',        monto: 70000,     pago: '2026-05-06', obs: null },
      { servicio: 'Nafta',          monto: 88000,     pago: '2026-05-02', obs: null },
      { servicio: 'Swiss Medical',  monto: 145755.38, pago: '2026-05-10', obs: null },
      { servicio: 'Spotify',        monto: 5499,      pago: '2026-05-10', obs: null },
    ],
  },
  // ── 2026-06 ─────────────────────────────────────────────────────────────────
  {
    periodo: '2026-06',
    personal: [
      { servicio: 'Adelí',          monto: 30000,  pago: '2026-06-04', obs: null },
      { servicio: 'Apple Cloud',    monto: 1449,   pago: '2026-06-09', obs: null },
      { servicio: 'ChatGPT/Claude', monto: 28600,  pago: '2026-06-09', obs: null },
      { servicio: 'Claro SA',       monto: 14811,  pago: '2026-06-06', obs: 'Pagar con ClaroPay, 15% de descuento.' },
      { servicio: 'Cochera Favito', monto: 37500,  pago: '2026-06-10', obs: null },
      { servicio: 'Las Cañas',      monto: 57777,  pago: '2026-06-06', obs: null },
      { servicio: 'Lion BV',        monto: 75000,  pago: '2026-06-06', obs: null },
      { servicio: 'Nafta',          monto: 180000, pago: '2026-06-15', obs: null },
      { servicio: 'Spotify',        monto: 5499,   pago: '2026-06-09', obs: null },
    ],
  },
]

// ─── Ingresos (2026 únicamente) ───────────────────────────────────────────────
// Sin fecha_cobro → estado 'pagado' sin fecha (son registros históricos ya cobrados).

const INGRESOS: PeriodoIngreso[] = [
  {
    periodo: '2026-01',
    ingresos: [
      { servicio: 'Cochera',     monto: 105813,    pago: null, obs: null },
      { servicio: 'Departamento',monto: 1041550,   pago: null, obs: null },
      { servicio: 'Salario PJ',  monto: 2311325,   pago: null, obs: null },
    ],
  },
  {
    periodo: '2026-02',
    ingresos: [
      { servicio: 'Cochera',     monto: 115555,    pago: null, obs: null },
      { servicio: 'Departamento',monto: 1041550,   pago: null, obs: null },
      { servicio: 'Salario PJ',  monto: 2700380,   pago: null, obs: null },
    ],
  },
  {
    periodo: '2026-03',
    ingresos: [
      { servicio: 'Cochera',     monto: 114479,    pago: null, obs: null },
      { servicio: 'Departamento',monto: 1063500,   pago: null, obs: null },
      { servicio: 'Salario PJ',  monto: 2622567,   pago: null, obs: null },
    ],
  },
  {
    periodo: '2026-04',
    ingresos: [
      { servicio: 'Cochera',     monto: 110.50,    pago: null, obs: null },
      { servicio: 'Departamento',monto: 1050000,   pago: null, obs: null },
      { servicio: 'Salario PJ',  monto: 3224000,   pago: null, obs: null },
    ],
  },
  {
    periodo: '2026-05',
    ingresos: [
      { servicio: 'Cochera',    monto: 116633,   pago: '2026-05-03', obs: null },
      { servicio: 'Salario PJ', monto: 3003600,  pago: null,          obs: null },
    ],
  },
  {
    periodo: '2026-06',
    ingresos: [
      { servicio: 'Cochera',     monto: 118978,   pago: null, obs: null },
      { servicio: 'Departamento',monto: 1050000,  pago: null, obs: null },
      { servicio: 'Salario PJ',  monto: 3029221,  pago: null, obs: null },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function upsertPlanilla(key: 'personal' | 'ingresos'): Promise<string> {
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
    console.log(`    ✓ Servicio "${def.nombre}" ya existe`)
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
      activo: def.activo,
      acumulable: false,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Error creando servicio "${def.nombre}": ${error.message}`)
  console.log(`    + Servicio "${def.nombre}" creado`)
  return data.id
}

async function insertGasto(servicioId: string, periodo: string, row: GastoRow, esIngreso = false): Promise<void> {
  const estado = (row.pago || esIngreso) ? 'pagado' : 'pendiente'
  const { error } = await supabase.from('gastos').upsert(
    {
      user_id: USER_ID,
      servicio_id: servicioId,
      periodo,
      monto: row.monto,
      vencimiento: null,
      fecha_pago: row.pago,
      estado,
      monto_confirmado: true,
      observacion: row.obs,
    },
    { onConflict: 'servicio_id,periodo', ignoreDuplicates: true },
  )
  if (error) throw new Error(`Error insertando gasto ${periodo}/${row.servicio}: ${error.message}`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Migración Personal + Ingresos Mensuales → Supabase ===\n')

  // 1. Planillas
  console.log('[ Planillas ]')
  const planillaIds = {
    personal: await upsertPlanilla('personal'),
    ingresos: await upsertPlanilla('ingresos'),
  }

  // 2. Servicios
  console.log('\n[ Servicios ]')
  const servicioMap: Record<'personal' | 'ingresos', Map<string, string>> = {
    personal: new Map(),
    ingresos: new Map(),
  }

  for (const key of ['personal', 'ingresos'] as const) {
    console.log(`  ${key}:`)
    for (const def of SERVICIOS_DEF[key]) {
      const id = await upsertServicio(planillaIds[key], def)
      servicioMap[key].set(def.nombre, id)
    }
  }

  // 3. Gastos - Personal (egresos)
  console.log('\n[ Gastos — Personal ]')
  let egresosOk = 0

  for (const { periodo, personal } of EGRESOS) {
    console.log(`  ${periodo}`)
    for (const row of personal) {
      const id = servicioMap.personal.get(row.servicio)
      if (!id) { console.warn(`    ⚠ Servicio no encontrado: "${row.servicio}"`); continue }
      await insertGasto(id, periodo, row)
      egresosOk++
    }
  }

  // 4. Gastos - Ingresos Mensuales
  console.log('\n[ Gastos — Ingresos Mensuales ]')
  let ingresosOk = 0

  for (const { periodo, ingresos } of INGRESOS) {
    console.log(`  ${periodo}`)
    for (const row of ingresos) {
      const id = servicioMap.ingresos.get(row.servicio)
      if (!id) { console.warn(`    ⚠ Servicio no encontrado: "${row.servicio}"`); continue }
      await insertGasto(id, periodo, row, true)
      ingresosOk++
    }
  }

  console.log(`\n=== Listo: ${egresosOk} egresos + ${ingresosOk} ingresos insertados ===`)
}

main().catch((e) => { console.error(e); process.exit(1) })
