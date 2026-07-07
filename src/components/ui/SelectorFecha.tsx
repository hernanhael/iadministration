'use client';

import { CalendarioMensual } from './CalendarioMensual';
import { Input } from './Input';
import { IconCalendario } from './icons';

interface Props {
  id?: string;
  /** Fecha en formato 'dd/mm/aaaa' (puede estar incompleta mientras el usuario tipea). */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Deja solo dígitos y les inserta las barras de dd/mm/aaaa a medida que se tipean. */
function conBarras(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 8);
  return [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4, 8)].filter(Boolean).join('/');
}

/** Input de fecha dd/mm/aaaa: se tipea con las barras solas; el calendario
 *  desplegable (CalendarioMensual) se abre únicamente con el ícono, para no
 *  interrumpir al usuario que solo quiere escribir la fecha. */
export function SelectorFecha({ id, value, onChange, placeholder = 'dd/mm/aaaa' }: Props) {
  return (
    <CalendarioMensual value={value} onElegir={onChange}>
      {({ alternar }) => (
        <div className="relative">
          <Input
            id={id}
            type="text"
            inputMode="numeric"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(conBarras(e.target.value))}
            className="pr-9"
          />
          <button
            type="button"
            aria-label="Elegir fecha del calendario"
            title="Elegir fecha del calendario"
            onClick={alternar}
            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted transition-colors hover:text-foreground"
          >
            <IconCalendario size={16} />
          </button>
        </div>
      )}
    </CalendarioMensual>
  );
}
