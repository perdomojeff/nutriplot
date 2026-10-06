'use client';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COL = ['#059669', '#F59E0B', '#2563EB', '#DB2777', '#7C3AED', '#0891B2', '#65A30D', '#DC2626'];
type M = { alias: string; inicio: string; pesos: number[] };

export default function GraficoFamilia({ miembros }: { miembros: M[] }) {
  const [modo, setModo] = useState<'peso' | 'bajado'>('bajado');
  const sem = Math.max(0, ...miembros.map((m) => m.pesos.length - 1));
  const data = Array.from({ length: sem + 1 }, (_, s) => {
    const fila: Record<string, number | string> = { semana: `Semana ${s}` };
    miembros.forEach((m) => { const p = m.pesos[s]; if (p !== undefined) fila[m.alias] = modo === 'peso' ? p : Math.round((m.pesos[0] - p) * 10) / 10; });
    return fila;
  });
  return (
    <section className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-bold">Progreso de toda la familia</h2><p className="pista">Cada persona desde su propio Día 0.</p></div>
        <div className="flex gap-1 rounded-2xl bg-verde-50 p-1">{([['bajado', 'Kilos bajados'], ['peso', 'Peso (kg)']] as const).map(([k, t]) =>
          <button key={k} aria-pressed={modo === k} onClick={() => setModo(k)} className={`min-h-10 rounded-xl px-4 text-sm font-semibold ${modo === k ? 'bg-white shadow-sm' : 'text-verde-700'}`}>{t}</button>)}</div>
      </div>
      <div className="h-72">
        <ResponsiveContainer><LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#DCFCE7" /><XAxis dataKey="semana" /><YAxis unit=" kg" domain={modo === 'peso' ? ['dataMin - 2', 'dataMax + 2'] : [0, 'dataMax + 1']} /><Tooltip /><Legend />
          {miembros.map((m, i) => <Line key={m.alias} dataKey={m.alias} stroke={COL[i % COL.length]} strokeWidth={3} dot={{ r: 4 }} connectNulls />)}
        </LineChart></ResponsiveContainer>
      </div>
    </section>
  );
}
