'use client';
import { useState, useTransition } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { registrarCheckin } from './actions';

const CAMPOS: [string, string, string, string][] = [
  ['peso_kg', 'Peso actual (kg)', '0.1', 'Báscula e impedancia'], ['masa_muscular_pct', 'Masa muscular (%)', '0.1', 'Báscula e impedancia'],
  ['grasa_subcutanea_pct', 'Grasa subcutánea (%)', '0.1', 'Báscula e impedancia'], ['grasa_visceral', 'Grasa visceral (índice)', '0.5', 'Báscula e impedancia'],
  ['pecho_cm', 'Pecho', '0.5', 'Medidas (cm)'], ['cintura_cm', 'Cintura', '0.5', 'Medidas (cm)'], ['cadera_cm', 'Cadera', '0.5', 'Medidas (cm)'],
  ['muslo_cm', 'Muslo', '0.5', 'Medidas (cm)'], ['biceps_cm', 'Bíceps', '0.5', 'Medidas (cm)'],
];

/** Reduce la foto a 1600 px y JPEG para que suba rápido incluso con datos móviles. */
async function comprimir(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error('foto'))), 'image/jpeg', 0.85));
}

export default function CheckinForm({ semana, familiaId, usuarioId }: { semana: number; familiaId: string; usuarioId: string }) {
  const [v, setV] = useState<Record<string, string>>({});
  const [fotos, setFotos] = useState<{ frente?: File; costado?: File }>({});
  const [prev, setPrev] = useState<{ frente?: string; costado?: string }>({});
  const [err, setErr] = useState(''); const [pend, start] = useTransition(); const [subiendo, setSubiendo] = useState(false);

  function elegir(lado: 'frente' | 'costado', f?: File | null) {
    if (!f) return; setFotos((p) => ({ ...p, [lado]: f })); setPrev((p) => ({ ...p, [lado]: URL.createObjectURL(f) })); setErr('');
  }
  async function enviar(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    if (CAMPOS.some(([k]) => !v[k])) return setErr('Todos los campos son obligatorios.');
    if (!fotos.frente || !fotos.costado) return setErr('Sube las dos fotos: una de frente y otra de costado.');
    setSubiendo(true);
    try {
      const sb = supabaseBrowser(), base = `${familiaId}/${usuarioId}/semana-${semana}`;
      for (const lado of ['frente', 'costado'] as const) {
        const blob = await comprimir(fotos[lado]!);
        const { error } = await sb.storage.from('fotos-progreso').upload(`${base}/${lado}.jpg`, blob, { upsert: true, contentType: 'image/jpeg' });
        if (error) throw new Error('No pudimos subir la foto de ' + lado + '. Intenta de nuevo.');
      }
      start(async () => { const r = await registrarCheckin(semana, v); if (r?.error) { setErr(r.error); setSubiendo(false); } });
    } catch (x: any) { setErr(x.message); setSubiendo(false); }
  }

  let seccion = '';
  return (
    <form onSubmit={enviar} className="card flex flex-col gap-5" noValidate>
      <p className="rounded-2xl bg-verde-50 p-4 text-verde-900 ring-1 ring-verde-200">Toma tus fotos bajo las mismas circunstancias de espacio, ropa e iluminación que el Día 0.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {CAMPOS.map(([k, l, step, sec]) => {
          const cab = sec !== seccion ? (seccion = sec, <h3 key={sec} className="col-span-full pt-2 text-lg font-bold">{sec}</h3>) : null;
          return <div key={k} className="contents">{cab}<div className="campo"><label htmlFor={k}>{l}</label>
            <input id={k} type="number" inputMode="decimal" step={step} value={v[k] ?? ''} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></div></div>;
        })}
      </div>
      <h3 className="text-lg font-bold">Fotos de progreso</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {(['frente', 'costado'] as const).map((lado) => (
          <label key={lado} className="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl border-2 border-dashed border-verde-300 bg-verde-50 p-4 text-center">
            {prev[lado] ? <img src={prev[lado]} alt={`Vista previa ${lado}`} className="max-h-64 rounded-2xl object-cover" /> : <><b className="text-verde-900">Foto de {lado}</b><span className="pista">Toca para elegir o tomar una foto</span></>}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => elegir(lado, e.target.files?.[0])} />
          </label>))}
      </div>
      <div className="campo"><label htmlFor="pasos_semana">Pasos de la semana (opcional)</label>
        <input id="pasos_semana" type="number" inputMode="numeric" value={v.pasos_semana ?? ''} onChange={(e) => setV({ ...v, pasos_semana: e.target.value })} />
        <p className="pista">Total que marca tu reloj. La meta es 70,000.</p></div>
      {err && <p className="error" role="alert">{err}</p>}
      <button className="btn !min-h-14 text-lg" disabled={pend || subiendo}>{subiendo || pend ? 'Guardando tu check-in…' : 'Guardar check-in y desbloquear mi plan'}</button>
    </form>
  );
}
