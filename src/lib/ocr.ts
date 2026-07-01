// Cliente del OCR de facturas (Fase 4). Lee una imagen (foto o adjunto) o un PDF
// y devuelve los datos para que el usuario los confirme. El archivo se procesa
// en memoria y NO se almacena. En modo vista previa (sin Supabase) simula la
// lectura para poder probar el flujo sin backend ni API key.
import { SUPABASE_CONFIGURADO } from './preview';
import { periodoActual, vencimientoDelPeriodo } from './formateo';

export interface DatosFactura {
  monto: number | null;
  vencimiento: string | null;
  empresa: string | null;
}

const MIME_VALIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

/** Convierte un File a base64 (sin el prefijo `data:...;base64,`). */
function aBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result;
      if (typeof res !== 'string') return reject(new Error('No se pudo leer la imagen.'));
      resolve(res.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}

/** Demo: inventa un resultado plausible para probar el flujo sin backend. */
async function simular(): Promise<DatosFactura> {
  await new Promise((r) => setTimeout(r, 1200)); // emula la latencia del modelo
  const monto = Math.round((8000 + Math.random() * 40000) / 100) * 100;
  return {
    monto,
    vencimiento: vencimientoDelPeriodo(periodoActual(), 10),
    empresa: 'Lectura de ejemplo',
  };
}

export async function leerFactura(file: File, instrucciones?: string): Promise<DatosFactura> {
  if (!MIME_VALIDOS.includes(file.type)) {
    throw new Error('Formato no soportado. Usá una imagen (JPG, PNG, WEBP) o un PDF.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('El archivo es muy pesado (máximo 5 MB).');
  }

  if (!SUPABASE_CONFIGURADO) return simular();

  const imagen = await aBase64(file);
  const res = await fetch('/api/ocr-factura', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imagen, mime: file.type, instrucciones }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? 'No se pudo leer la factura.');
  }
  return data as DatosFactura;
}
