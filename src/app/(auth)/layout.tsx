export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">
            <span className="text-brand">I</span>
            <span className="text-danger">A</span>
            <span className="text-foreground">dministration</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            Administrá tus gastos fijos de vivienda y personales.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {children}
        </div>
      </div>
    </main>
  );
}
