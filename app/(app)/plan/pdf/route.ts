import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createElement } from 'react';
import { cargarMiembro, requerirPerfil } from '@/lib/datos';
import { cantidad, grupos, macros, nombre, pasos, receta, sinEtiquetas, type Ctx } from '@/lib/recetas';
import { PlanPDF, type DiaPDF } from '@/components/PlanPDF';

export const runtime = 'nodejs';

const foto = (img: string) => { try { return 'data:image/jpeg;base64,' + fs.readFileSync(path.join(process.cwd(), 'public', 'recetas', img + '.jpg')).toString('base64'); } catch { return undefined; } };

export async function GET(req: Request) {
  const uid = new URL(req.url).searchParams.get('u');
  const { sb, perfil } = await requerirPerfil();
  const { u } = await cargarMiembro(sb, uid ?? perfil.id);
  if (!u) return new NextResponse('No encontrado', { status: 404 });
  const { data: plan } = await sb.from('planes_alimentacion').select('*').eq('usuario_id', u.id).order('semana', { ascending: false }).limit(1).maybeSingle();
  if (!plan) return new NextResponse('Plan bloqueado o inexistente', { status: 403 });   // RLS: sin check-in no hay plan

  const dias: DiaPDF[] = plan.contenido.dias.map((d: any) => ({
    dia: d.dia, comidas: d.comidas.map((m: any) => {
      const r = receta(m.receta), ctx: Ctx = { id: m.receta, v: m.variante, s: m.porcion * 1, u: 'met', p: m.perfil, porcion: m.porcion }, M = macros(ctx);
      const ing = grupos(ctx).flatMap((g) => g.items.map((it: any) => { const A = cantidad(ctx, it); return `${A.p}${A.sec ? ' (' + A.sec + ')' : ''} ${it.u === '' ? nombre(it.name, A.n) : 'de ' + it.name}`; }));
      const ST = pasos(ctx);
      return { tipo: m.tipo, nombre: r.title, tiempo: r.total, kcal: M.kcal, proteina: M.p, foto: foto(r.img), ingredientes: ing,
        pasos: ST.map((s: any) => sinEtiquetas(s.x)), notas: [...(M.plate ? ['Cómo servir: ' + M.plate] : []), ...ST.filter((s: any) => s.pf).map((s: any) => sinEtiquetas(s.pf))] };
    }),
  }));
  const buf = await renderToBuffer(createElement(PlanPDF, { alias: u.alias, semana: plan.semana, calorias: plan.calorias_dia, dias }) as any);
  return new NextResponse(new Uint8Array(buf), { headers: { 'content-type': 'application/pdf', 'content-disposition': `inline; filename="nutriplot-semana-${plan.semana}.pdf"` } });
}
