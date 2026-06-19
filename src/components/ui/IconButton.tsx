import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

export const clasesIconButton =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-muted transition-colors hover:border-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40';

const clases = clasesIconButton;

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function IconButton({ className = '', ...props }, ref) {
    return <button ref={ref} className={`${clases} ${className}`} {...props} />;
  },
);

/** Variante como enlace (para “Pagar” con url externa). */
export function IconLinkButton({
  className = '',
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={`${clases} ${className}`} {...props} />;
}
