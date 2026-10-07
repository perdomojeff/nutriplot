// Valida el recetario con el motor real: node scripts/validar-recetas.mjs [id-receta]
// Copia lib/*.ts a un directorio temporal (Node 22 quita los tipos) y prueba cada receta × variante × perfil × porciones.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const lib = path.resolve(import.meta.dirname, '../lib');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rec-'));
for (const f of fs.readdirSync(lib).filter((x) => /^recetas.*\.ts$/.test(x))) {
  fs.writeFileSync(path.join(tmp, f), fs.readFileSync(path.join(lib, f), 'utf8').replace(/from '(\.\/[\w-]+)'/g, "from '$1.ts'"));
}
const E = await import(path.join(tmp, 'recetas.ts'));
const only = process.argv[2];
const errs = [], warns = [];
const e = (id, m) => errs.push(`${id}: ${m}`), w = (id, m) => warns.push(`${id}: ${m}`);
const UNI = ['', 'taza', 'cda', 'cdta', 'lb', 'oz'], UNM = ['g', 'ml'];
const ids = new Set();
for (const r of E.RECETAS) {
  if (only && r.id !== only) continue;
  if (ids.has(r.id)) e(r.id, 'id duplicado'); ids.add(r.id);
  for (const k of ['meal', 'cuisine', 'title', 'sub', 'prep', 'cook', 'total', 'base', 'variants', 'groups', 'steps', 'tools', 'tips', 'store', 'swaps'])
    if (r[k] === undefined) e(r.id, 'falta ' + k);
  if (!['Desayuno', 'Almuerzo', 'Cena'].includes(r.meal)) e(r.id, 'meal inválido ' + r.meal);
  if (r.total !== r.prep + r.cook) w(r.id, `total ${r.total} ≠ prep+cook ${r.prep + r.cook}`);
  if (!r.variants?.some((v) => !v.sea)) e(r.id, 'no tiene variante sin mariscos');
  for (const v of r.variants || []) {
    for (const k of ['id', 'label', 'sub', 'kcal', 'p', 'c', 'f', 'd']) if (v[k] === undefined) e(r.id, `variante ${v.id}: falta ${k}`);
    const kc = v.p * 4 + v.c * 4 + v.f * 9;
    if (Math.abs(kc - v.kcal) > v.kcal * 0.12) w(r.id, `variante ${v.id}: kcal ${v.kcal} vs macros ${Math.round(kc)}`);
    if (v.kcal < 250 || v.kcal > 750) w(r.id, `variante ${v.id}: kcal fuera de rango (${v.kcal})`);
    for (const p of ['std', 'atleta', 'mayor']) for (const s of [2, 4, 6]) {
      const c = { id: r.id, v: v.id, s, u: s === 4 ? 'us' : 'met', p, porcion: 1 };
      let G, S, M;
      try { G = E.grupos(c); S = E.pasos(c); M = E.macros(c); } catch (x) { e(r.id, `${v.id}/${p}/${s}: excepción ${x.message}`); continue; }
      if (!G.length) e(r.id, `${v.id}: sin ingredientes`);
      if (!S.length) e(r.id, `${v.id}: sin pasos`);
      for (const st of S) {
        if (/\[[a-z_]+\]/.test(st.x) || /\[[a-z_]+\]/.test(st.pf)) e(r.id, `${v.id}/${p}: ingrediente sin resolver en «${st.t}»: ${(st.x + st.pf).match(/\[[a-z_]+\]/)[0]}`);
        if (!st.x || !st.t) e(r.id, `${v.id}: paso vacío`);
        if (/undefined|NaN/.test(st.x + st.t + (st.cue || '') + (st.warn || ''))) e(r.id, `${v.id}: «undefined/NaN» en «${st.t}»`);
      }
      if (![M.kcal, M.p, M.c, M.f].every(Number.isFinite)) e(r.id, `${v.id}/${p}: macros no numéricos`);
      if (s === 4 && p === 'std') for (const g of G) for (const it of g.items) {
        if (!/^[a-z_]+$/.test(it.id)) e(r.id, `id de ingrediente inválido: ${it.id}`);
        if (!UNI.includes(it.u)) e(r.id, `unidad US inválida «${it.u}» (${it.id})`);
        if (it.a && !UNM.includes(it.au)) e(r.id, `unidad métrica inválida «${it.au}» (${it.id})`);
        if (typeof it.q !== 'number' || it.q <= 0) e(r.id, `cantidad inválida (${it.id})`);
        if (!it.name || !it.s) e(r.id, `falta nombre/corto (${it.id})`);
        if (it.u !== '' && it.a === undefined) w(r.id, `sin equivalente métrico (${it.id})`);
        // todo ingrediente debería usarse en algún paso
        const usado = S.some((st) => st.x.includes('<b>') && false);
      }
    }
    // cada ingrediente de la variante debe aparecer referenciado en algún paso (texto fuente)
    const src = JSON.stringify(r.steps.map((s) => [String(s.x), s.add || {}]));
    for (const g of E.grupos({ id: r.id, v: v.id, s: r.base, u: 'met', p: 'std' })) for (const it of g.items)
      if (!new RegExp('\\{' + it.id + '[:}]').test(src) && !new RegExp('\\{' + it.id + '[:}]').test(String(r.steps.map((s) => (typeof s.x === 'function' ? s.x(v.id) : s.x)).join(' '))))
        w(r.id, `${v.id}: el ingrediente «${it.id}» no se menciona en ningún paso`);
  }
  r.steps?.forEach((s, i) => { if (s.timer && typeof s.timer !== 'number' && typeof s.timer !== 'object') e(r.id, `paso ${i}: timer inválido`); });
  if (r.steps && !r.steps.every((s) => s.t && s.x && s.time)) e(r.id, 'paso sin t/x/time');
  if (!Array.isArray(r.tips) || r.tips.length < 2 || r.tips.some((t) => t.length !== 2)) e(r.id, 'tips deben ser [[título, texto], …] (≥2)');
}
console.log(`Recetas: ${ids.size}  ·  errores: ${errs.length}  ·  avisos: ${warns.length}`);
errs.forEach((x) => console.log('ERROR ', x)); warns.slice(0, 60).forEach((x) => console.log('aviso ', x));
process.exit(errs.length ? 1 : 0);
