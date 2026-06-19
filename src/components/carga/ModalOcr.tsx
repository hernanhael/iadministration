'use client';

import { useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormMessage } from '@/components/ui/FormMessage';
import { IconCamara, IconDoc } from '@/components/ui/icons';
import { leerFactura, type DatosFactura } from '@/lib/ocr';
import { SUPABASE_CONFIGURADO } from '@/lib/preview';

type Modo = 'foto' | 'documento';

interface Props {
  abierto: boolean;
  modo: Modo;
  servicioNombre: string;
  /** Archivo ya capturado (foto tomada desde la fila): se muestra la vista previa directo. */
  archivoInicial?: File | null;
  onCerrar: () => void;
  /** Datos leídos para precargar el formulario (requiere confirmación del usuario). */
  onLeido: (datos: DatosFactura) => void;
}

const TEXTOS: Record<Modo, { titulo: string; accept: string; vacio: string; hint: string }> = {
  foto: {
    titulo: 'Leer factura por foto',
    accept: 'image/jpeg,image/png,image/webp',
    vacio: 'Sacar foto o elegir imagen',
    hint: 'JPG, PNG o WEBP (máx. 5 MB)',
  },
  documento: {
    titulo: 'Leer datos de un documento',
    accept: 'image/jpeg,image/png,image/webp,application/pdf',
    vacio: 'Adjuntar documento',
    hint: 'Imagen o PDF (máx. 5 MB)',
  },
};

/** Cargar una factura/documento y extraer monto/vencimiento con IA (no se guarda el archivo). */
export function ModalOcr({ abierto, modo, servicioNombre, archivoInicial, onCerrar, onLeido }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(archivoInicial ?? null);
  const [preview, setPreview] = useState<string | null>(
    archivoInicial && archivoInicial.type.startsWith('image/')
      ? URL.createObjectURL(archivoInicial)
      : null,
  );
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = TEXTOS[modo];
  const esImagen = archivo?.type.startsWith('image/');

  function elegir(file: File | null) {
    setError(null);
    setArchivo(file);
    setPreview(file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
  }

  async function leer() {
    if (!archivo) return;
    setLeyendo(true);
    setError(null);
    try {
      const datos = await leerFactura(archivo);
      onLeido(datos);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el documento.');
    } finally {
      setLeyendo(false);
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={`${t.titulo} — ${servicioNombre}`}>
      <div className="flex flex-col gap-4">
        {!SUPABASE_CONFIGURADO && (
          <FormMessage tipo="info">
            Modo vista previa: la lectura es simulada. Con Supabase y la API key conectadas, lee el
            archivo de verdad. El archivo no se guarda.
          </FormMessage>
        )}
        {error && <FormMessage tipo="error">{error}</FormMessage>}

        <input
          ref={inputRef}
          type="file"
          accept={t.accept}
          {...(modo === 'foto' ? { capture: 'environment' as const } : {})}
          className="hidden"
          onChange={(e) => elegir(e.target.files?.[0] ?? null)}
        />

        {archivo ? (
          esImagen && preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Vista previa del documento"
              className="max-h-64 w-full rounded-xl border border-border object-contain"
            />
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3">
              <IconDoc size={22} className="shrink-0 text-muted" />
              <span className="truncate text-sm font-semibold">{archivo.name}</span>
            </div>
          )
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-muted transition-colors hover:border-muted hover:text-foreground"
          >
            {modo === 'foto' ? <IconCamara size={28} /> : <IconDoc size={28} />}
            <span className="text-sm font-semibold">{t.vacio}</span>
            <span className="text-xs">{t.hint}</span>
          </button>
        )}

        <div className="flex items-center justify-between gap-2">
          {archivo && (
            <Button variante="ghost" onClick={() => inputRef.current?.click()} disabled={leyendo}>
              Cambiar
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button variante="ghost" onClick={onCerrar} disabled={leyendo}>
              Cancelar
            </Button>
            <Button variante="secondary" onClick={leer} disabled={!archivo || leyendo}>
              {leyendo ? 'Leyendo…' : 'Leer datos'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
