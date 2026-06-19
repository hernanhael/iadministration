'use client';

import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface Props {
  abierto: boolean;
  titulo: string;
  mensaje: React.ReactNode;
  textoConfirmar?: string;
  peligro?: boolean;
  onConfirmar: () => Promise<void> | void;
  onCancelar: () => void;
}

export function Confirmacion({
  abierto,
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  peligro = false,
  onConfirmar,
  onCancelar,
}: Props) {
  const [procesando, setProcesando] = useState(false);

  async function confirmar() {
    setProcesando(true);
    try {
      await onConfirmar();
    } finally {
      setProcesando(false);
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={onCancelar} titulo={titulo}>
      <div className="text-sm text-muted">{mensaje}</div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variante="secondary" onClick={onCancelar} disabled={procesando}>
          Cancelar
        </Button>
        <Button variante={peligro ? 'danger' : 'primary'} onClick={confirmar} disabled={procesando}>
          {procesando ? 'Procesando…' : textoConfirmar}
        </Button>
      </div>
    </Modal>
  );
}
