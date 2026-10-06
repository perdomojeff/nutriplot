import Link from 'next/link';
import { redirect } from 'next/navigation';
import { estadoCheckin, fechaLarga, requerirPerfil, pesosReales } from '@/lib/datos';
import GraficoFamilia from '@/components/GraficoFamilia';
import { invitar } from './actions';

export const metadata = { title: 'Familia' };

export default async function Page() {
  const { sb, perfil } = await requerirPerfil();
  if (perfil.rol !== 'admin') redirect('/');
  const [{ data: us }, { data: cks }] = await Promise.all([
    sb.from('usuarios').select('*').eq('familia_id', perfil.familia_id).order('creado_en'),
    sb.from('checkins_semanales').select('usuario_id,semana,peso_kg,pasos_semana').order('semana'),
  ]);
  const filas = (us ?? []).map((u) => {
    const c = (cks ?? []).filter((x) => x.usuario_id === u.id), activo = !!u.fecha_inicio;
    const pesos = activo ? pesosReales(u, c) : [], est = activo ? estadoCheckin(u, c) : null;
    return { u, pesos, est, c };
  });
  const pendientes = filas.filter((f) => f.est?.vencido).length;
  return (
    <>
      <header><h1 className="text-3xl font-extrabold">Mi familia</h1><p className="pista">Aquí ves el avance de todos. Cada persona entra con su propio acceso y solo ve su sesión.</p></header>
      <section className="grid gap-3 sm:grid-cols-3">
        {[['Miembros', String(filas.length)], ['Check-ins pendientes', String(pendientes)], ['Kilos bajados entre todos', filas.reduce((a, f) => a + (f.pesos.length ? f.pesos[0] - f.pesos.at(-1)! : 0), 0).toFixed(1) + ' kg']].map(([a, b]) =>
          <div key={a} className="card !p-4"><p className="pista">{a}</p><p className="font-display text-2xl font-extrabold text-verde-900">{b}</p></div>)}
      </section>
      <GraficoFamilia miembros={filas.filter((f) => f.pesos.length).map((f) => ({ alias: f.u.alias, inicio: f.u.fecha_inicio, pesos: f.pesos }))} />
      <section className="grid gap-3 md:grid-cols-2">
        {filas.map(({ u, pesos, est }) => (
          <div key={u.id} className="card flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2"><h2 className="text-xl font-bold">{u.alias}{u.id === perfil.id && ' (yo)'}</h2>
              {est?.vencido ? <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900">Falta check-in</span>
                : u.fecha_inicio ? <span className="rounded-full bg-verde-100 px-3 py-1 text-sm font-bold text-verde-900">Al día</span>
                : <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-bold">{u.auth_user_id ? 'Falta su Día 0' : 'Invitación enviada'}</span>}</div>
            {pesos.length ? <p className="pista">{pesos.at(-1)!.toFixed(1)} kg · bajó {(pesos[0] - pesos.at(-1)!).toFixed(1)} kg · próximo check-in {fechaLarga(est!.due)}</p>
              : <p className="pista">{u.email_invitacion}{!u.auth_user_id && ' · todavía no creó su cuenta'}</p>}
            {u.fecha_inicio && <div className="flex gap-2"><Link className="btn-ghost !min-h-10 !px-4" href={`/?u=${u.id}`}>Progreso</Link><Link className="btn-ghost !min-h-10 !px-4" href={`/plan?u=${u.id}`}>Plan</Link></div>}
          </div>))}
      </section>
      <form action={invitar} className="card flex flex-col gap-3">
        <h2 className="text-xl font-bold">Invitar a un familiar</h2>
        <p className="pista">Se registra con este mismo correo y entra directo a su perfil.</p>
        <div className="grid gap-3 sm:grid-cols-2"><div className="campo"><label htmlFor="alias">Nombre o apodo</label><input id="alias" name="alias" required maxLength={40} /></div>
          <div className="campo"><label htmlFor="email">Correo</label><input id="email" name="email" type="email" required /></div></div>
        <button className="btn self-start">Agregar a la familia</button>
      </form>
    </>
  );
}
