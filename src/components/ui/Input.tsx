import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`h-11 w-full rounded-lg border border-border bg-surface px-3 text-base text-foreground outline-none transition-colors placeholder:text-muted/60 placeholder:italic hover:border-muted focus:border-muted focus:ring-2 focus:ring-muted/30 md:text-sm ${className}`}
        {...props}
      />
    );
  },
);
