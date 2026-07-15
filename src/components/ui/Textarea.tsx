import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = '', ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={`min-h-20 w-full rounded-lg border border-border bg-surface px-3 py-2 text-base text-foreground outline-none transition-colors placeholder:text-muted/60 hover:border-muted focus:border-muted focus:ring-2 focus:ring-muted/30 md:text-sm ${className}`}
        {...props}
      />
    );
  },
);
