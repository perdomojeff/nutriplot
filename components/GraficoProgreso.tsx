'use client';
// Curva real + dos metas escritas:
//  · Meta deseada (Día 0): fecha prevista al empezar. Fija.
//  · Meta deseada realista: proyección que se recalcula con cada check-in (proyectarDinamico).
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { proyectar, proyectarDinamico, addDias, iso } from '@/lib/calculos';

interface Props {
  fechaInicio: string;        // yyyy-mm-dd del Día 0
  pesosReales: number[];      // índice = semana (0 = Día 0)
  pesoMeta: number;           // peso deseado
  ritmoPlan: number;          // kg/semana del plan al empezar (rigurosidad con tope calórico)
}

const dmy = (isoStr: string) => isoStr.split('-').reverse().join('/');
const fechaSem = (inicio: Date, s: number) => dmy(iso(addDias(inicio, s * 7)));

export default function GraficoProgreso({ fechaInicio, pesosReales, pesoMeta, ritmoPlan }: Props) {
  const inicio = new Date(fechaInicio + 'T12:00:00');
  const p0 = pesosReales[0];
  const dia0 = proyectar(inicio, p0, pesoMeta, ritmoPlan);
  const real = proyectarDinamico({ fechaInicio: inicio, pesosReales, pesoMeta, ritmoPlan });

  const dSem = Math.round((Date.parse(real.fechaMeta) - Date.parse(dia0.fechaMeta)) / (7 * 864e5));
  const diff = dSem === 0 ? 'Igual que el Día 0'
    : dSem > 0 ? `${dSem} ${dSem === 1 ? 'semana más tarde' : 'semanas más tarde'} que el Día 0`
    : `${-dSem} ${dSem === -1 ? 'semana antes' : 'semanas antes'} que el Día 0`;

  const n = pesosReales.length - 1;
  const maxSem = Math.max(Math.ceil(dia0.semanasTotales), real.puntos.at(-1)?.semana ?? 0, n);
  const data = Array.from({ length: maxSem + 1 }, (_, s) => ({
    fecha: fechaSem(inicio, s),
    dia0: s <= Math.ceil(dia0.semanasTotales) ? dia0.puntos.find(p => p.semana === s)?.pesoKg : undefined,
    realista: real.puntos.find(p => p.semana === s)?.pesoKg,
    real: pesosReales[s],
  }));

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-verde-100">
      <h3 className="mb-4 text-xl font-semibold text-verde-900">Tu camino semana a semana</h3>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl p-4 ring-1 ring-verde-100">
          <p className="text-xs font-bold uppercase tracking-wider text-verde-700">Meta deseada (Día 0)</p>
          <p className="text-xl font-semibold text-verde-900">{pesoMeta.toFixed(1)} kg · {dmy(dia0.fechaMeta)}</p>
          <p className="text-sm text-verde-700">Fecha prevista al empezar. No cambia.</p>
        </div>
        <div className="rounded-2xl bg-verde-50 p-4 ring-2 ring-verde-500">
          <p className="text-xs font-bold uppercase tracking-wider text-verde-700">Meta deseada realista</p>
          <p className="text-xl font-semibold text-verde-900">{pesoMeta.toFixed(1)} kg · {dmy(real.fechaMeta)}</p>
          <p className="text-sm text-verde-700">Se recalcula con cada check-in. <b>{diff}</b></p>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#DCFCE7" />
            <XAxis dataKey="fecha" interval="preserveStartEnd" minTickGap={48} />
            <YAxis domain={['dataMin - 2', 'dataMax + 2']} unit=" kg" />
            <Tooltip />
            <Legend />
            <Line name="Ruta del Día 0 (fija)" dataKey="dia0" stroke="#9CA3AF" strokeDasharray="2 5" dot={false} connectNulls />
            <Line name="Proyección realista" dataKey="realista" stroke="#059669" strokeDasharray="6 4" dot={false} connectNulls />
            <Line name="Progreso real" dataKey="real" stroke="#064E3B" strokeWidth={3} dot={{ r: 4 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
