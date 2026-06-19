'use client';

interface Props {
  valor: 'egreso' | 'ingreso';
  onChange: (v: 'egreso' | 'ingreso') => void;
}

export function TabTipo({ valor, onChange }: Props) {
  return (
    <div className="flex w-fit rounded-xl border border-border bg-surface p-1">
      {(['ingreso', 'egreso'] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`rounded-lg px-5 py-1.5 text-sm font-semibold transition-colors ${
            valor === t
              ? 'bg-surface-2 text-foreground shadow-sm'
              : 'text-muted hover:text-foreground'
          }`}
        >
          {t === 'egreso' ? 'Egresos' : 'Ingresos'}
        </button>
      ))}
    </div>
  );
}
