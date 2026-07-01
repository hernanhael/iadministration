// Íconos SVG mínimos (stroke currentColor). Tamaño por defecto 18px.
type IconProps = { className?: string; size?: number };

function base(size = 18) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

export function IconCamara({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

export function IconLink({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M14 5h5v5" />
      <path d="M19 5l-7 7" />
      <path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

export function IconDoc({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v4h4" />
    </svg>
  );
}

export function IconPuntos({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconPuntosV({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconCheck({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

export function IconMas({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconChevron({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** Candado cerrado (planilla bloqueada: solo lectura/estructura protegida). */
export function IconCandado({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/** Candado abierto (planilla desbloqueada: se pueden editar/agregar servicios). */
export function IconCandadoAbierto({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 7.5-1.8" />
    </svg>
  );
}

export function IconLapiz({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

/** Sobre (gasto cargado automáticamente por el cron de Gmail). */
export function IconMail({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

export function IconBasura({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
