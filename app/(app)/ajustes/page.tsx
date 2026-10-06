import { requerirPerfil } from '@/lib/datos';
import { guardarPreferencias, salir } from './actions';
import PushToggle from './PushToggle';

export const metadata = { title: 'Ajustes' };

export default async function Page() {
  const { perfil: p, user } = await requerirPerfil();
  const Sel = ({ n, l, v, ops }: { n: string; l: string; v: string; ops: [string, string][] }) =>
    <div className="campo"><label htmlFor={n}>{l}</label><select id={n} name={n} defaultValue={v}>{ops.map(([a, b]) => <option key={a} value={a}>{b}</option>)}</select></div>;
  return (
    <>
      <header><h1 className="text-3xl font-extrabold">Ajustes</h1><p className="pista">{p.alias} · {user.email}</p></header>
      <section className="card flex flex-col gap-3"><h2 className="text-xl font-bold">Recordatorio de check-in</h2>
        <p className="pista">Un día antes de tu check-in te llega: «Mañana es día de comprobar tus avances y recuerda que el plan no se desbloquea hasta que hagas tu check-in.»</p>
        <PushToggle /></section>
      <form action={guardarPreferencias} className="card flex flex-col gap-4"><h2 className="text-xl font-bold">Mi alimentación</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Sel n="evita_mariscos" l="Mariscos" v={String(p.evita_mariscos)} ops={[['false', 'Los como'], ['true', 'Prefiero no comerlos']]} />
          <Sel n="comidas_por_dia" l="Comidas al día" v={String(p.comidas_por_dia)} ops={[['3', '3 comidas'], ['2', '2 comidas']]} />
          <Sel n="entrena_fuerza" l="Entrenamiento de fuerza" v={String(p.entrena_fuerza)} ops={[['false', 'No entreno fuerza'], ['true', 'Entreno fuerte']]} />
          <Sel n="movilidad" l="Movilidad" v={p.movilidad} ops={[['normal', 'Normal'], ['reducida', 'Reducida'], ['muy_reducida', 'Muy reducida']]} />
          <Sel n="textura" l="Textura de la comida" v={p.textura} ops={[['normal', 'Normal'], ['suave', 'Suave'], ['molida', 'Molida o picada fina']]} /></div>
        <label className="flex min-h-12 items-center gap-3"><input type="checkbox" name="recordatorio_activo" defaultChecked={p.recordatorio_activo} className="h-5 w-5 accent-verde-600" /><span>Quiero recibir el recordatorio de check-in</span></label>
        <p className="pista">Los cambios se aplican al plan de la próxima semana. Tu Día 0 no se puede modificar.</p>
        <button className="btn self-start">Guardar cambios</button></form>
      <form action={salir}><button className="btn-ghost">Cerrar sesión</button></form>
    </>
  );
}
