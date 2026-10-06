import Link from 'next/link';
import { cargarMiembro, estadoCheckin, fechaLarga, pesosReales, requerirPerfil } from '@/lib/datos';
import { calcularPlanCalorico, calcularEdad } from '@/lib/calculos';
import GraficoProgreso from '@/components/GraficoProgreso';

export const metadata = { title: 'Mi progreso' };

export default async function Inicio({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  const { u: uid } = await searchParams;
  const { sb, perfil } = await requerirPerfil();
  const { u, cks } = await cargarMiembro(sb, uid ?? perfil.id);
  if (!u?.fecha_inicio) return <p className="card">Este perfil todavía no completó su Día 0.</p>;
  const mio = u.id === perfil.id, pesos = pesosReales(u, cks), actual = pesos.at(-1)!, bajado = pesos[0] - actual;
  const est = estadoCheckin(u, cks);
  const plan0 = calcularPlanCalorico({ sexo: u.sexo, pesoKg: pesos[0], alturaCm: Number(u.altura_cm), edad: calcularEdad(new Date(u.fecha_nacimiento + 'T12:00:00')), actividad: u.actividad, rigurosidad: u.rigurosidad });
  const hacia = Math.max(0, Math.min(100, Math.round((bajado / (pesos[0] - Number(u.peso_deseado_kg))) * 100)));
  const kpis: [string, string, string][] = [
    ['Peso actual', `${actual.toFixed(1)} kg`, `Inicio ${pesos[0].toFixed(1)} kg`],
    ['Bajado hasta hoy', `${bajado.toFixed(1)} kg`, cks.length ? `${(bajado / cks.length).toFixed(2)} kg por semana` : 'Aún sin check-ins'],
    ['Camino a tu meta', `${hacia} %`, `Meta ${Number(u.peso_deseado_kg).toFixed(1)} kg`],
    ['Próximo check-in', fechaLarga(est.due), est.vencido ? 'Ya puedes hacerlo' : `En ${est.dias} ${est.dias === 1 ? 'día' : 'días'}`],
  ];
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-3xl font-extrabold">{mio ? 'Mi progreso' : `Progreso de ${u.alias}`}</h1>
          <p className="pista">{cks.length ? `Semana ${cks.length} de tu transformación.` : 'Tu transformación empezó.'} Empezaste el {fechaLarga(u.fecha_inicio)}.</p></div>
        {!mio && <Link className="btn-ghost" href="/familia">Volver a la familia</Link>}
      </header>
      {mio && est.vencido && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-amber-50 p-5 ring-1 ring-amber-200">
          <div><b className="text-amber-900">Semana {est.siguienteSemana}: sube tus datos para ver tu plan</b><p className="pista">Peso, medidas y 2 fotos. Sin ellos, el plan nuevo permanece bloqueado.</p></div>
          <Link href="/checkin" className="btn">Hacer check-in</Link></div>)}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(([a, b, c]) => <div key={a} className="card !p-4"><p className="pista">{a}</p><p className="font-display text-2xl font-extrabold text-verde-900">{b}</p><p className="pista">{c}</p></div>)}
      </section>
      <GraficoProgreso fechaInicio={u.fecha_inicio} pesosReales={pesos} pesoMeta={Number(u.peso_deseado_kg)} ritmoPlan={Math.max(0.05, plan0.ritmoRealKgSemana)} />
      <section className="card">
        <h2 className="mb-1 text-xl font-bold">{mio ? 'Mi punto de partida' : `Punto de partida de ${u.alias}`}</h2>
        <p className="pista mb-4">Congelado el {fechaLarga(u.fecha_inicio)}. Sirve para comparar tu avance.</p>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {([['Peso inicial', `${Number(u.peso_inicial_kg).toFixed(1)} kg`], ['Altura', `${u.altura_cm} cm`], ['Complexión', u.complexion], ['Peso ideal médico', `${Number(u.peso_ideal_medico_kg).toFixed(1)} kg`],
            ['Pecho', `${u.pecho_cm} cm`], ['Cintura', `${u.cintura_cm} cm`], ['Cadera', `${u.cadera_cm} cm`], ['Muslos', `${u.muslo_izq_cm} / ${u.muslo_der_cm} cm`],
            ['Bíceps', `${u.biceps_izq_cm} / ${u.biceps_der_cm} cm`], ['Muñeca', `${u.muneca_cm} cm`], ['Rigurosidad', u.rigurosidad], ['Calorías al día', `${u.calorias_objetivo} kcal`]] as [string, string][]).map(([a, b]) =>
            <div key={a} className="rounded-2xl bg-verde-50 p-3"><dt className="pista">{a}</dt><dd className="font-semibold capitalize text-verde-900">{b}</dd></div>)}
        </dl>
      </section>
    </>
  );
}
