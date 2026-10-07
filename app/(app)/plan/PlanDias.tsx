'use client';
import Link from 'next/link';
import { useState } from 'react';

export default function PlanDias({ dias }: { dias: any[] }) {
  const [d, setD] = useState(0);
  return (
    <>
      <div role="tablist" aria-label="Días" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {dias.map((x, i) => <button key={x.dia} role="tab" aria-selected={i === d} onClick={() => setD(i)}
          className={`min-h-12 shrink-0 rounded-full px-5 font-semibold ${i === d ? 'bg-verde-600 text-white' : 'bg-white text-verde-900 ring-1 ring-verde-200'}`}>Día {x.dia}</button>)}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dias[d].comidas.map((c: any) => (
          <Link key={c.tipo} href={c.href} className="card flex flex-col gap-3 !p-0 overflow-hidden transition hover:shadow-md">
            {c.foto
              ? <img src={c.foto} alt={`Foto referencial: ${c.titulo}`} className="aspect-[3/2] w-full object-cover" />
              : <div aria-hidden className="flex aspect-[3/2] w-full items-center justify-center bg-gradient-to-br from-verde-100 to-verde-300 text-5xl">{c.tipo === 'Desayuno' ? '🍳' : c.tipo === 'Almuerzo' ? '🥗' : '🍲'}</div>}
            <div className="flex flex-col gap-2 p-5 pt-1">
              <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider"><span className="rounded-full bg-verde-100 px-3 py-1 text-verde-900">{c.tipo}</span>
                {c.sea && <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-800">Con mariscos</span>}</div>
              <h3 className="text-lg font-bold leading-snug">{c.titulo}</h3>
              <p className="pista">{c.var} · {c.tiempo} min · {c.kcal} kcal · {c.p} g de proteína</p>
              <span className="font-semibold text-verde-600">Ver receta completa →</span>
            </div>
          </Link>))}
      </div>
    </>
  );
}
