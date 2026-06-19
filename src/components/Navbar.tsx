'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MenuUsuario } from '@/components/MenuUsuario';

const links = [
  { href: '/dashboard', label: 'Mes' },
  { href: '/historico', label: 'Histórico' },
  { href: '/graficos', label: 'Gráficos e Informes', short: 'Gráficos' },
];

export function Navbar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-2 gap-y-2 px-4 py-3">
        <Link
          href="/dashboard"
          className="order-1 shrink-0 text-lg font-extrabold tracking-tight text-foreground sm:text-xl"
        >
          <span className="text-brand">I</span>
          <span className="text-danger">A</span>
          <span className="text-foreground">dministration</span>
        </Link>

        <div className="no-scrollbar order-3 flex w-full items-center gap-1 overflow-x-auto sm:order-2 sm:ml-3 sm:w-auto sm:flex-1">
          {links.map((l) => {
            const activo = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  activo
                    ? 'bg-surface-2 text-foreground'
                    : 'text-muted hover:bg-surface hover:text-foreground'
                }`}
              >
                {l.short ? (
                  <>
                    <span className="md:hidden">{l.short}</span>
                    <span className="hidden md:inline">{l.label}</span>
                  </>
                ) : (
                  l.label
                )}
              </Link>
            );
          })}
        </div>

        <div className="order-2 ml-auto flex shrink-0 items-center sm:order-3 sm:ml-0">
          <MenuUsuario email={email} />
        </div>
      </nav>
    </header>
  );
}
