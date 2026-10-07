// Motor de recetas: escala porciones, convierte unidades y adapta por perfil. Sin estado ni React.
import * as datos from './recetas-data';
import { EXTRA } from './recetas-extra';

const RECETAS: any[] = [...(datos.RECETAS as any[]), ...(EXTRA as any[])];
const PERFILES: any[] = datos.PERFILES as any[];
const PROF: any = datos.PROF;
const PSTEP: any = datos.PSTEP;
export { RECETAS, PERFILES };
export type PerfilId = 'std' | 'atleta' | 'mayor';
export interface Ctx {
  id: string;            // receta
  v: string;             // variante
  s: number;             // porciones a cocinar
  u: 'met' | 'us';       // unidad principal
  p: PerfilId;           // perfil de quien come
  porcion?: number;      // multiplicador de porción (si viene del plan, según calorías)
}

export const receta = (id: string): any => RECETAS.find((r: any) => r.id === id);

const FR: [number, string][] = [[0, ''], [.125, '⅛'], [.25, '¼'], [1 / 3, '⅓'], [.375, '⅜'], [.5, '½'], [.625, '⅝'], [2 / 3, '⅔'], [.75, '¾'], [.875, '⅞'], [1, '']];
function frac(x: number) {
  let w = Math.floor(x + 1e-9); const f = x - w; let b = FR[0], bd = 9;
  for (const p of FR) { const d = Math.abs(f - p[0]); if (d < bd) { bd = d; b = p; } }
  if (b[0] === 1) { w += 1; return { t: String(w), n: w }; }
  if (!w && !b[1]) return { t: '⅛', n: .125 };
  return { t: (w || '') + b[1], n: w + b[0] };
}
function us(it: any, m: number) {
  let x = it.q * m, u = it.u;
  if (u === 'cdta' && x >= 3) { x /= 3; u = 'cda'; }
  if (u === 'cda' && x >= 4) { x /= 16; u = 'taza'; }
  if (u === '') { const r = it.r || .5; x = Math.max(r, Math.round(x / r) * r); const q = frac(x); return { n: q.n, t: q.t, count: true }; }
  if (u === 'lb') x = Math.max(.25, Math.round(x / .25) * .25);
  if (u === 'oz') x = Math.max(.5, Math.round(x / .5) * .5);
  const q = frac(x);
  const lab: Record<string, string> = { taza: q.n <= 1 ? 'taza' : 'tazas', cda: 'cda.', cdta: 'cdta.', lb: 'lb', oz: 'oz' };
  return { n: q.n, t: q.t + ' ' + lab[u], count: false };
}
function met(it: any, m: number) {
  let x = it.a * m, u = it.au;
  if (x >= 1000) { x /= 1000; u = u === 'g' ? 'kg' : 'l'; return { t: Math.round(x * 100) / 100 + ' ' + u }; }
  x = x < 5 ? Math.max(.5, Math.round(x * 2) / 2) : x < 20 ? Math.round(x) : Math.round(x / 5) * 5;
  return { t: x + ' ' + u };
}
export const nombre = (name: string, n: number) => n === 1 ? name.replace(/~\w*/g, '') : name.replace(/~(\w*)/g, '$1');

export function grupos(c: Ctx) {
  const r = receta(c.id), out: { g: string; items: any[] }[] = [];
  r.groups.forEach((g: any) => {
    if (g.v && !g.v.includes(c.v)) return;
    const it = g.items.filter((a: any) => !a[8] || a[8].includes(c.v))
      .map((a: any) => ({ id: a[0], q: a[1], u: a[2], a: a[3], au: a[4], name: a[5], s: a[6], note: a[7], r: a[9] }));
    if (it.length) out.push({ g: g.g, items: it });
  });
  return out;
}
const findIng = (c: Ctx, id: string) => { for (const g of grupos(c)) for (const i of g.items) if (i.id === id) return i; return null; };

export function cantidad(c: Ctx, it: any, mult = 1) {
  const m = (c.s / receta(c.id).base) * mult, a = us(it, m), b = it.a ? met(it, m) : null;
  if (a.count) return { p: a.t, sec: b ? b.t : '', n: a.n };
  return c.u === 'met' && b ? { p: b.t, sec: a.t, n: a.n } : { p: a.t, sec: b ? b.t : '', n: a.n };
}
function tok(c: Ctx, str: string) {
  return str.replace(/\{N\}/g, String(c.s)).replace(/\{([a-z_]+)(?::(\d+)\/(\d+))?\}/g, (_, id, a, b) => {
    const it = findIng(c, id); if (!it) return `<b>[${id}]</b>`;
    const A = cantidad(c, it, a ? (+a) / (+b) : 1);
    if (it.u === '') return `<b>${A.p} ${nombre(it.s || it.name, A.n)}</b>`;
    return `<b>${A.p}${A.sec ? ' (' + A.sec + ')' : ''} de ${it.s}</b>`;
  });
}
const val = (x: any, v: string) => typeof x === 'function' ? x(v) : x;
const pickV = (o: any, v: string) => o && typeof o === 'object' ? (v in o ? o[v] : o.d) : o;

export function pasos(c: Ctx) {
  const r = receta(c.id);
  return r.steps.map((s: any, i: number) => ({ s, i })).filter((o: any) => !o.s.v || o.s.v.includes(c.v)).map(({ s, i }: any) => {
    let x = val(s.x, c.v); if (s.add && s.add[c.v]) x += ' ' + s.add[c.v];
    const pf = ((PSTEP[c.id] || {})[i] || {})[c.p];
    return { t: val(s.t, c.v), time: val(s.time, c.v), x: tok(c, x), cue: val(s.cue, c.v), warn: val(s.warn, c.v), timer: pickV(s.timer, c.v) || 0, pf: pf ? tok(c, pf) : '' };
  });
}
export const variante = (c: Ctx) => receta(c.id).variants.find((v: any) => v.id === c.v) ?? receta(c.id).variants[0];

// Adaptación genérica para las recetas que no traen una adaptación escrita a mano por perfil.
const GEN: any = {
  atleta: { mult: 1.4, add: { kcal: 0, p: 0, c: 0, f: 0 },
    plate: 'Porción grande (≈ 1½ porciones), con una fuente extra de proteína (huevo, pollo, yogur griego o legumbres) hasta acercarte a 40 g de proteína en la comida.',
    ad: ['Más proteína en cada comida para conservar músculo mientras bajas grasa.', 'Suma una porción de carbohidrato (arroz, avena, papa, pan integral) en la comida previa o posterior al entrenamiento.', 'Bebe agua con la comida y durante el entrenamiento.'] },
  mayor: { mult: .8, add: { kcal: 0, p: 0, c: 0, f: 0 },
    plate: 'Porción un poco más pequeña (≈ ⅘), con la proteína desmenuzada o en trozos pequeños y las verduras bien blandas.',
    ad: ['Prioriza la proteína en cada comida (25–30 g) para cuidar músculo y fuerza.', 'Carnes, pollo y pescado muy bien cocidos y tiernos; huevos siempre firmes, nunca húmedos.', 'Verduras cocidas hasta que se aplasten con un tenedor y cortadas en trozos pequeños.', 'Bebe líquidos a lo largo del día aunque no sientas sed. Cualquier cambio de plan debe consultarse con su médico o nutricionista.'] },
};

/** Calorías y macros de UNA porción para esta persona. */
export function macros(c: Ctx) {
  const v = variante(c), P = (PROF[c.id] || {})[c.p] ?? GEN[c.p];
  const mult = c.porcion ?? (P ? P.mult : 1), add = P ? P.add : { kcal: 0, p: 0, c: 0, f: 0 };
  return {
    kcal: Math.round(v.kcal * mult + add.kcal), p: Math.round(v.p * mult + add.p),
    c: Math.round(v.c * mult + add.c), f: Math.round(v.f * mult + add.f),
    plate: P ? P.plate : null, ad: P ? P.ad : [] as string[],
  };
}
export const perfilInfo = (id: PerfilId) => PERFILES.find((p: any) => p.id === id);
export const sinEtiquetas = (h: string) => h.replace(/<[^>]+>/g, '');
