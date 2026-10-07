import Link from 'next/link';
import { cargarMiembro, estadoCheckin, fechaLarga, requerirPerfil } from '@/lib/datos';
import { macros, receta, type Ctx } from '@/lib/recetas';
import { generarPlan, VERSION_PLAN } from '@/lib/plan';
import PlanDias from './PlanDias';

export const metadata = { title: 'Plan de comidas' };

export default async function Page({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  const { u: uid } = await searchParams;
  const { sb, perfil } = await requerirPerfil();
  const { u, cks } = await cargarMiembro(sb, uid ?? perfil.id);
  const mio = u.id === perfil.id, est = estadoCheckin(u, cks);

  if (mio && est.vencido) return (
    <>
      <h1 className="text-3xl font-extrabold">Plan de comidas</h1>
      <div className="card flex flex-col items-start gap-3"><b className="text-xl text-verde-900">Tu plan está bloqueado</b>
        <p className="pista">Tu check-in de la semana {est.siguienteSemana} se abrió el {fechaLarga(est.due)}. Sube tu peso, medidas y 2 fotos para desbloquear el plan nuevo.</p>
        <Link href="/checkin" className="btn">Hacer check-in</Link></div>
    </>);

  const leerPlan = async () => (await sb.from('planes_alimentacion').select('*').eq('usuario_id', u.id).order('semana', { ascending: false }).limit(1).maybeSingle()).data;
  let plan = await leerPlan();
  // Planes creados con una versión anterior del recetario (7 días iguales): se rehacen con el recetario completo.
  if (plan && mio && plan.contenido?.version !== VERSION_PLAN) {
    try { await generarPlan(sb, u, plan.semana, Number(plan.perfil_aplicado?.peso_base_kg ?? u.peso_inicial_kg)); plan = (await leerPlan()) ?? plan; } catch { /* se muestra el plan existente */ }
  }
  if (!plan) return <><h1 className="text-3xl font-extrabold">Plan de comidas</h1><p className="card">Todavía no hay un plan disponible.</p></>;

  const dias = plan.contenido.dias.map((d: any) => ({
    dia: d.dia, comidas: d.comidas.map((m: any) => {
      const r = receta(m.receta), ctx: Ctx = { id: m.receta, v: m.variante, s: 1, u: 'met', p: m.perfil, porcion: m.porcion }, M = macros(ctx);
      const v = r.variants.find((x: any) => x.id === m.variante);
      return { tipo: m.tipo, titulo: r.title, foto: r.img ? `/recetas/${r.img}.jpg` : null, kcal: M.kcal, p: M.p, tiempo: r.total, var: v.label, sea: !!v.sea,
        href: `/receta/${m.receta}?v=${m.variante}&p=${m.perfil}&porcion=${m.porcion}&s=1` };
    }),
  }));
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-3xl font-extrabold">{mio ? 'Mi plan de comidas' : `Plan de ${u.alias}`}</h1>
          <p className="pista">Semana {plan.semana} · {plan.calorias_dia} kcal al día · {plan.comidas_por_dia} comidas</p></div>
        <a className="btn" download href={`/plan/pdf${mio ? '' : `?u=${u.id}`}`}>Descargar PDF de la semana</a>
      </header>
      <PlanDias dias={dias} />
      <p className="pista">Cada día trae platos distintos y la semana siguiente el orden cambia. Las porciones se ajustan a tus calorías y a tu perfil.</p>
    </>
  );
}
