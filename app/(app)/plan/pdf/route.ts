import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createElement } from 'react';
import { cargarMiembro, requerirPerfil } from '@/lib/datos';
import { cantidad, grupos, macros, nombre, pasos, receta, sinEtiquetas, type Ctx } from '@/lib/recetas';
import { PlanPDF, type DiaPDF } from '@/components/PlanPDF';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Helvetica (fuente estándar del PDF) solo trae Latin-1/WinAnsi: se reemplazan fracciones y símbolos que no existen en ella.
const RARO: Record<string, string> = { '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8', '⅓': '1/3', '⅔': '2/3', '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5', '≈': '~', '≥': '>=', '≤': '<=', '→': '->', '–': '-', '—': '-', '−': '-', '\u202f': ' ', '\u00a0': ' ' };
const limpiar = (t: string) => t.replace(/[⅛⅜⅝⅞⅓⅔⅕⅖⅗⅘≈≥≤→–—−\u202f\u00a0]/g, (c) => RARO[c] ?? '').replace(/[^\x20-\x7E\u00A1-\u00FF\u2018\u2019\u201C\u201D\u2022\u2026\n]/g, '');

const foto = (img: string) => { try { return 'data:image/jpeg;base64,' + fs.readFileSync(path.join(process.cwd(), 'public', 'recetas', img + '.jpg')).toString('base64'); } catch { return undefined; } };

export async function GET(req: Request) {
  try { return await generar(req); }
  catch (e: any) { console.error('PDF del plan falló:', e); return new NextResponse('No se pudo generar el PDF: ' + (e?.message ?? 'error desconocido'), { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } }); }
}

async function generar(req: Request) {
  const uid = new URL(req.url).searchParams.get('u');
  const { sb, perfil } = await requerirPerfil();
  const { u } = await cargarMiembro(sb, uid ?? perfil.id);
  if (!u) return new NextResponse('No encontrado', { status: 404 });
  const { data: plan } = await sb.from('planes_alimentacion').select('*').eq('usuario_id', u.id).order('semana', { ascending: false }).limit(1).maybeSingle();
  if (!plan) return new NextResponse('Plan bloqueado o inexistente', { status: 403 });   // RLS: sin check-in no hay plan

  const dias: DiaPDF[] = plan.contenido.dias.map((d: any) => ({
    dia: d.dia, comidas: d.comidas.map((m: any) => {
      const r = receta(m.receta), ctx: Ctx = { id: m.receta, v: m.variante, s: m.porcion * 1, u: 'met', p: m.perfil, porcion: m.porcion }, M = macros(ctx);
      const ing = grupos(ctx).flatMap((g) => g.items.map((it: any) => { const A = cantidad(ctx, it); return limpiar(`${A.p}${A.sec ? ' (' + A.sec + ')' : ''} ${it.u === '' ? nombre(it.name, A.n) : 'de ' + it.name}`); }));
      const ST = pasos(ctx);
      return { tipo: m.tipo, nombre: limpiar(r.title), tiempo: r.total, kcal: M.kcal, proteina: M.p, foto: r.img ? foto(r.img) : undefined, ingredientes: ing,
        pasos: ST.map((s: any) => limpiar(sinEtiquetas(s.x))), notas: [...(M.plate ? ['Cómo servir: ' + M.plate] : []), ...ST.filter((s: any) => s.pf).map((s: any) => sinEtiquetas(s.pf))].map(limpiar) };
    }),
  }));
  const buf = await renderToBuffer(createElement(PlanPDF, { alias: limpiar(String(u.alias)), semana: plan.semana, calorias: plan.calorias_dia, dias }) as any);
  return new NextResponse(new Uint8Array(buf), { headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="nutriplot-semana-${plan.semana}.pdf"` } });
}
