import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

type Variante = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
}

const estilos: Record<Variante, string> = {
  primary:
    'border border-brand/40 bg-brand/8 text-brand hover:bg-brand/15 disabled:opacity-50',
  secondary:
    'bg-surface text-foreground border border-border hover:bg-background disabled:opacity-50',
  ghost:
    'bg-transparent text-muted hover:text-foreground hover:bg-background disabled:opacity-50',
  danger:
    'border border-danger/40 bg-danger/8 text-danger hover:bg-danger/15 disabled:opacity-50',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variante = 'primary', className = '', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${estilos[variante]} ${className}`}
      {...props}
    />
  );
});
