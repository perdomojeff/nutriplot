import { notFound } from 'next/navigation';
import Link from 'next/link';
import RecetaVista from '@/components/RecetaVista';
import { receta, type PerfilId } from '@/lib/recetas';
import { requerirPerfil } from '@/lib/datos';
import { perfilDe } from '@/lib/plan';

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params, q = await searchParams;
  const r = receta(id); if (!r) notFound();
  const { perfil } = await requerirPerfil();
  const p = (['std', 'atleta', 'mayor'].includes(q.p) ? q.p : perfilDe(perfil)) as PerfilId;
  const vOk = r.variants.some((v: any) => v.id === q.v);
  const v = vOk ? q.v : r.variants.find((x: any) => !(perfil.evita_mariscos && x.sea))?.id ?? r.variants[0].id;
  const porcion = q.porcion && +q.porcion > 0.3 && +q.porcion < 2.5 ? +q.porcion : undefined;
  return (
    <>
      <Link href="/plan" className="pista underline">← Volver al plan</Link>
      <RecetaVista inicial={{ id, v, s: Math.min(12, Math.max(1, Number(q.s) || 4)), u: 'met', p, porcion }} foto={`/recetas/${r.img}.jpg`} />
    </>
  );
}
