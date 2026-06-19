type Tipo = 'error' | 'success' | 'info';

const ESTILOS: Record<Tipo, string> = {
  error: 'border-danger/30 bg-danger/10 text-danger',
  success: 'border-brand/30 bg-brand/10 text-brand',
  info: 'border-border bg-surface-2 text-muted',
};

export function FormMessage({ tipo, children }: { tipo: Tipo; children: React.ReactNode }) {
  if (!children) return null;
  const estilo = ESTILOS[tipo];
  return (
    <p className={`rounded-lg border px-3 py-2 text-sm ${estilo}`} role="alert">
      {children}
    </p>
  );
}
