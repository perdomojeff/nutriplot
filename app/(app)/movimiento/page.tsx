import { requerirPerfil } from '@/lib/datos';
import { META_PASOS_SEMANA, evaluarPasos } from '@/lib/pasos';
import { guardarPasos } from './actions';

export const metadata = { title: 'Movimiento' };
const COLOR = { verde: 'bg-verde-50 ring-verde-200 text-verde-900', ambar: 'bg-amber-50 ring-amber-200 text-amber-900', suave: 'bg-sky-50 ring-sky-200 text-sky-900' };

export default async function Page() {
  const { sb, perfil } = await requerirPerfil();
  const { data: cks } = await sb.from('checkins_semanales').select('semana,pasos_semana').eq('usuario_id', perfil.id).order('semana', { ascending: false }).limit(6);
  const ult = cks?.[0];
  const pasos = ult?.pasos_semana ?? null, fb = pasos !== null ? evaluarPasos(pasos) : null;
  return (
    <>
      <header><h1 className="text-3xl font-extrabold">Movimiento</h1><p className="pista">Meta: {META_PASOS_SEMANA.toLocaleString('es')} pasos por semana (10,000 al día).</p></header>
      <section className="card flex flex-col gap-4">
        <h2 className="text-xl font-bold">Pasos de la semana</h2>
        {!ult ? <p className="pista">Aparecerá aquí cuando hagas tu primer check-in.</p> : <>
          <form action={guardarPasos} className="flex flex-wrap items-end gap-3">
            <div className="campo flex-1"><label htmlFor="pasos">Total de pasos que marca tu reloj (semana {ult.semana})</label><input id="pasos" name="pasos" type="number" inputMode="numeric" required defaultValue={pasos ?? ''} /></div>
            <button className="btn">Guardar</button></form>
          {fb && pasos !== null && <>
            <div className="h-3 overflow-hidden rounded-full bg-verde-100" role="img" aria-label={`${Math.round(pasos / META_PASOS_SEMANA * 100)} % de la meta`}><div className="h-full rounded-full bg-verde-500" style={{ width: `${Math.min(100, pasos / META_PASOS_SEMANA * 100)}%` }} /></div>
            <p className={`rounded-2xl p-4 ring-1 ${COLOR[fb.color]}`}>{fb.mensaje}</p></>}</>}
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card flex flex-col gap-2"><h2 className="text-xl font-bold">Fuerza (2–3 días por semana)</h2>
          <p className="pista">Para conservar músculo mientras bajas de peso. Descansa 48 horas entre sesiones del mismo músculo.</p>
          <h3 className="mt-2 font-bold">En casa, con tu peso corporal</h3>
          <ul className="list-disc pl-5 text-gray-700"><li>Sentadillas: 3 series de 10–15</li><li>Flexiones (en la pared o con rodillas si hace falta): 3 × 8–12</li><li>Zancadas alternas: 3 × 10 por pierna</li><li>Plancha: 3 × 20–40 segundos</li><li>Puente de glúteos: 3 × 12–15</li></ul>
          <h3 className="mt-2 font-bold">En gimnasio</h3>
          <ul className="list-disc pl-5 text-gray-700"><li>Prensa de piernas: 3 × 10–12</li><li>Press de pecho en máquina o mancuernas: 3 × 8–12</li><li>Remo sentado: 3 × 10–12</li><li>Press de hombros: 3 × 8–12</li><li>Peso muerto rumano ligero: 3 × 8–10</li></ul>
          <p className="pista">Empieza con un peso que te deje 2 repeticiones de reserva. Si tienes lesiones o una condición médica, consulta antes con tu médico.</p></section>
        <section className="card flex flex-col gap-2"><h2 className="text-xl font-bold">Cardio</h2>
          <ul className="list-disc pl-5 text-gray-700"><li><b>Frecuencia:</b> 3–5 días por semana.</li><li><b>Intensidad moderada:</b> puedes hablar, pero no cantar. Unos 30–45 minutos.</li><li><b>Intervalos (1 día, opcional):</b> 1 minuto rápido y 2 de suave, 8–10 veces.</li><li><b>Ideas:</b> caminata rápida, bicicleta, natación, baile, elíptica.</li></ul>
          <h3 className="mt-2 font-bold">Si tu movilidad es limitada</h3>
          <ul className="list-disc pl-5 text-gray-700"><li>Caminatas de 10 minutos, 3 veces al día, cerca de una silla o pasamanos.</li><li>Ejercicios sentado: elevar rodillas, remo con banda elástica, levantarte y sentarte de la silla 8–10 veces.</li><li>Prioriza el equilibrio y la fuerza de piernas para prevenir caídas.</li></ul></section>
      </div>
    </>
  );
}
