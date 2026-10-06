'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Nav({ alias, admin }: { alias: string; admin: boolean }) {
  const ruta = usePathname();
  const items = [['/', 'Inicio'], ['/checkin', 'Check-in'], ['/plan', 'Plan'], ['/movimiento', 'Movimiento'], ...(admin ? [['/familia', 'Familia']] : []), ['/ajustes', 'Ajustes']];
  const activo = (h: string) => (h === '/' ? ruta === '/' : ruta.startsWith(h) || (h === '/plan' && ruta.startsWith('/receta')));
  return (
    <>
      <header className="sticky top-0 z-20 bg-verde-900 text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-display text-xl font-extrabold"><img src="/icon.svg" alt="" className="h-8 w-8" />NutriPlot</Link>
          <nav aria-label="Principal" className="ml-auto hidden gap-1 md:flex">
            {items.map(([h, t]) => <Link key={h} href={h} aria-current={activo(h) ? 'page' : undefined}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${activo(h) ? 'bg-verde-400 text-verde-900' : 'text-verde-100 hover:bg-white/10'}`}>{t}</Link>)}
          </nav>
          <span className="ml-auto rounded-full border border-white/30 px-3 py-1 text-sm md:ml-2">{alias}</span>
        </div>
      </header>
      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-20 border-t border-verde-100 bg-white md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ul className="mx-auto flex max-w-lg justify-around">
          {items.map(([h, t]) => <li key={h} className="flex-1"><Link href={h} aria-current={activo(h) ? 'page' : undefined}
            className={`flex min-h-14 items-center justify-center px-1 text-[13px] font-semibold ${activo(h) ? 'text-verde-600 underline decoration-2 underline-offset-8' : 'text-gray-600'}`}>{t}</Link></li>)}
        </ul>
      </nav>
    </>
  );
}
