'use client';
import { useEffect, useMemo, useState } from 'react';
import '@/app/recetas.css';
import { PERFILES, RECETAS, cantidad, grupos, macros, nombre, pasos, perfilInfo, receta, type Ctx, type PerfilId } from '@/lib/recetas';

const fmt = (s: number) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
type Tm = { left: number; end: number; run: boolean; fin: boolean };

function beep() {
  try {
    const a = new (window.AudioContext || (window as any).webkitAudioContext)();
    [0, .35, .7].forEach((t) => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; g.gain.value = .15; o.connect(g); g.connect(a.destination); o.start(a.currentTime + t); o.stop(a.currentTime + t + .2); });
  } catch {}
  try { navigator.vibrate?.([200, 100, 200]); } catch {}
}

export default function RecetaVista({ inicial, foto }: { inicial: Ctx; foto?: string }) {
  const [c, setC] = useState<Ctx>(inicial);
  const [chk, setChk] = useState<Record<string, boolean>>({});
  const [tm, setTm] = useState<Record<string, Tm>>({});
  const [cook, setCook] = useState<number | null>(null);
  const r = receta(c.id), v = r.variants.find((x: any) => x.id === c.v) ?? r.variants[0];
  const ST = useMemo(() => pasos(c), [c]);
  const M = macros(c), G = useMemo(() => grupos(c), [c]);
  const kc = M.p * 4, kcc = M.c * 4, kcf = M.f * 9, tot = kc + kcc + kcf, pf = perfilInfo(c.p);

  useEffect(() => {
    const id = setInterval(() => setTm((prev) => {
      let ch = false; const n = { ...prev };
      for (const k in n) { const t = n[k]; if (t.run) { const left = Math.max(0, Math.round((t.end - Date.now()) / 1000)); if (left !== t.left) { ch = true; n[k] = { ...t, left, run: left > 0, fin: left <= 0 }; if (left <= 0) beep(); } } }
      return ch ? n : prev;
    }), 250);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { if (cook !== null) { try { (navigator as any).wakeLock?.request('screen').catch(() => {}); } catch {} } }, [cook]);
  useEffect(() => {
    if (cook === null) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') setCook((i) => (i! >= ST.length - 1 ? null : i! + 1)); if (e.key === 'ArrowLeft') setCook((i) => Math.max(0, i! - 1)); if (e.key === 'Escape') setCook(null); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [cook, ST.length]);

  const toggleTm = (k: string, secs: number) => setTm((p) => {
    const t = p[k];
    if (!t || t.fin) return { ...p, [k]: { left: secs, end: Date.now() + secs * 1000, run: true, fin: false } };
    if (t.run) return { ...p, [k]: { ...t, run: false, left: Math.max(0, Math.round((t.end - Date.now()) / 1000)) } };
    return { ...p, [k]: { ...t, run: true, end: Date.now() + t.left * 1000 } };
  });
  const Timer = ({ i, secs }: { i: number; secs: number }) => {
    const k = `${c.id}|${c.v}|${i}`, t = tm[k];
    return (<button type="button" className={`tmr${t?.run ? ' run' : ''}${t?.fin ? ' fin' : ''}`} onClick={() => toggleTm(k, secs)}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M9 2h6" /></svg>
      <span className="d">{t?.fin ? '¡Listo!' : fmt(t ? t.left : secs)}</span><span>{t?.run ? 'Pausar' : t?.fin ? 'Reiniciar' : 'Iniciar'}</span></button>);
  };
  const Notas = ({ s }: { s: any }) => (<>
    {s.cue && <div className="note ok"><b>Señal de que va bien</b>{s.cue}</div>}
    {s.pf && <div className="note ok"><b>Para {pf.short}</b><span dangerouslySetInnerHTML={{ __html: s.pf }} /></div>}
    {s.warn && <div className="note hot"><b>Cuidado</b>{s.warn}</div>}</>);
  const set = (p: Partial<Ctx>) => setC((x) => ({ ...x, ...p }));
  const cs = cook !== null ? ST[cook] : null;

  return (
    <div className="rx" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <section className="hero" style={foto ? undefined : { gridTemplateColumns: '1fr' }}>
        {foto && <figure className="photo" style={{ margin: 0 }}><img src={foto} alt={`Foto referencial: ${r.title}`} />
          <figcaption><span>Foto referencial generada con IA</span></figcaption></figure>}
        <div className="col"><div className="tags"><span className="tag">{r.meal}</span><span className="tag">{r.cuisine}</span>{v.sea && <span className="tag sea">Con mariscos</span>}</div>
          <h2>{r.title}</h2><p>{r.sub}</p>
          <div className="times"><div><b className="num">{r.prep} min</b><span>Preparación</span></div><div><b className="num">{r.cook} min</b><span>Cocción</span></div><div><b className="num">{r.total} min</b><span>Total</span></div></div></div>
      </section>

      <section className="ctl" aria-label="Opciones">
        <div className="c-var"><span className="lbl">¿Para quién cocinas?</span>
          <div className="seg">{PERFILES.map((x: any) => <button key={x.id} type="button" aria-pressed={x.id === c.p} onClick={() => set({ p: x.id as PerfilId, porcion: undefined })}><b>{x.label}</b><small>{x.sub}</small></button>)}</div>
          {c.p !== 'std' && <div className="note ok" style={{ marginTop: 10 }}><b>Por qué cambia</b>{pf.note}</div>}</div>
        <div className="c-var"><span className="lbl">Variante</span>
          <div className="seg">{r.variants.map((x: any) => <button key={x.id} type="button" aria-pressed={x.id === v.id} onClick={() => set({ v: x.id })}><b>{x.label}</b><small>{x.sub}</small></button>)}</div>
          <p style={{ marginTop: 8, fontSize: '.9rem', color: 'var(--ink2)' }}>{v.d}</p></div>
        <div className="c-srv"><span className="lbl">Porciones a cocinar</span><div className="step">
          <button type="button" aria-label="Menos porciones" onClick={() => set({ s: Math.max(1, c.s - 1) })}>−</button><output className="num" aria-live="polite">{c.s}</output>
          <button type="button" aria-label="Más porciones" onClick={() => set({ s: Math.min(12, c.s + 1) })}>+</button></div></div>
        <div className="c-uni"><span className="lbl">Unidades principales</span><div className="seg two">
          <button type="button" aria-pressed={c.u === 'met'} onClick={() => set({ u: 'met' })}><b>g / ml</b></button>
          <button type="button" aria-pressed={c.u === 'us'} onClick={() => set({ u: 'us' })}><b>tazas / cda.</b></button></div></div>
        <div className="c-cook"><button type="button" className="btn" onClick={() => setCook(0)}>Modo cocina</button></div>
        <div className="macros"><span className="lbl" style={{ margin: 0 }}>{c.p === 'std' && !c.porcion ? 'Por porción' : `Tu porción · ${pf.label.toLowerCase()}${c.porcion ? ` (${c.porcion.toFixed(2).replace(/0$/, '')}× la receta)` : ''}`}</span>
          <div className="mrow"><div><b className="num">{M.kcal}</b><span>kcal</span></div><div><b className="num">{M.p} g</b><span>proteína</span></div><div><b className="num">{M.c} g</b><span>carbohidratos</span></div><div><b className="num">{M.f} g</b><span>grasa</span></div></div>
          <div className="bar" role="img" aria-label="Reparto de calorías"><i style={{ width: `${kc / tot * 100}%` }} /><i style={{ width: `${kcc / tot * 100}%` }} /><i style={{ width: `${kcf / tot * 100}%` }} /></div>
          <div className="legend"><span><i style={{ background: '#047857' }} />Proteína {Math.round(kc / tot * 100)} %</span><span><i style={{ background: '#34D399' }} />Carbohidratos {Math.round(kcc / tot * 100)} %</span><span><i style={{ background: '#F59E0B' }} />Grasa {Math.round(kcf / tot * 100)} %</span></div>
          {M.plate && <><div className="note ok"><b>Cómo servir</b>{M.plate}</div><ul className="adapt">{M.ad.map((a: string) => <li key={a}>{a}</li>)}</ul></>}</div>
      </section>

      <div className="cols">
        <aside className="ing" aria-label="Ingredientes"><h3>Ingredientes</h3>
          <p className="sub">Para {c.s} {c.s === 1 ? 'porción' : 'porciones'} estándar. Toca cada uno para marcarlo mientras lo reúnes.</p>
          {G.map((g) => <div key={g.g}><div className="grp">{g.g}</div><ul>{g.items.map((it: any) => {
            const A = cantidad(c, it), k = `${c.id}|${c.v}|${it.id}`;
            return (<li key={k}><label><input type="checkbox" checked={!!chk[k]} onChange={(e) => setChk({ ...chk, [k]: e.target.checked })} />
              <span className="t"><span className="amt">{A.p}</span> {it.u === '' ? nombre(it.name, A.n) : 'de ' + it.name}
                {A.sec && <span className="sec">{it.u === '' ? '· ' + A.sec : '(' + A.sec + ')'}</span>}{it.note && <span className="nt">{it.note}</span>}</span></label></li>);
          })}</ul></div>)}
        </aside>
        <section className="steps"><h3 style={{ font: '800 1.4rem/1.2 var(--f-display)', color: 'var(--head)' }}>Preparación</h3>
          <ol>{ST.map((s: any, i: number) => (<li className="st" key={i}><div className="n">{i + 1}</div>
            <div className="b"><div className="tm">{s.time}</div><h4>{s.t}</h4><p dangerouslySetInnerHTML={{ __html: s.x }} /><Notas s={s} />{s.timer ? <Timer i={i} secs={s.timer} /> : null}</div></li>))}</ol>
          <div className="extra"><div><h3>Equipo</h3><p>{r.tools}</p></div><div><h3>Guardar y recalentar</h3><p>{r.store}</p></div>
            <div><h3>Notas de cocina</h3><ul>{r.tips.map((t: string[]) => <li key={t[0]}><b>{t[0]}.</b> {t[1]}</li>)}</ul></div>
            <div><h3>Cambios posibles</h3><ul>{r.swaps.map((t: string) => <li key={t}>{t}</li>)}</ul></div></div>
        </section>
      </div>
      <p className="foot">Fotos referenciales generadas con IA; el plato real puede variar. Calorías y macros son estimaciones por porción y no reemplazan la guía de un nutricionista.</p>

      {cs && cook !== null && (
        <div className="cook" role="dialog" aria-modal="true" aria-label="Modo cocina">
          <header><span>{r.title.split(' con ')[0]} · paso {cook + 1} de {ST.length}</span><button type="button" onClick={() => setCook(null)}>Cerrar</button></header>
          <div className="bar2">{ST.map((_: any, i: number) => <i key={i} className={i <= cook ? 'on' : ''} />)}</div>
          <main><h2>{cs.t}</h2><p dangerouslySetInnerHTML={{ __html: cs.x }} /><Notas s={cs} />{cs.timer ? <Timer i={cook} secs={cs.timer} /> : null}</main>
          <nav><button type="button" className="btn ghost" disabled={cook === 0} style={cook === 0 ? { opacity: .4 } : undefined} onClick={() => setCook(cook - 1)}>Anterior</button>
            <button type="button" className="btn" onClick={() => setCook(cook >= ST.length - 1 ? null : cook + 1)}>{cook === ST.length - 1 ? 'Terminar' : 'Siguiente'}</button></nav>
        </div>)}
    </div>
  );
}
