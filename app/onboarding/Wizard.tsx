'use client';
import { useMemo, useState, useTransition } from 'react';
import { calcularEdad, calcularPlanCalorico, clasificarComplexion, pesoIdealMedico, validarPesoDeseado } from '@/lib/calculos';
import { confirmarDia0 } from './actions';

const V0 = {
  sexo: '', fecha_nacimiento: '', altura_cm: '', peso_inicial_kg: '', pecho_cm: '', cintura_cm: '', cadera_cm: '',
  muslo_izq_cm: '', muslo_der_cm: '', biceps_izq_cm: '', biceps_der_cm: '', muneca_cm: '',
  horas_sueno: '', hora_dormir: '22:30', estres_1_5: '3', actividad: '', peso_deseado_kg: '', rigurosidad: 'moderado',
  comidas_por_dia: '3', evita_mariscos: false, entrena_fuerza: false, movilidad: 'normal', textura: 'normal',
};
type F = typeof V0;
const NC = { pequena: 'Pequeña', mediana: 'Mediana', grande: 'Grande' } as const;

function Num({ f, k, label, set, step = '0.1', hint }: { f: F; k: keyof F; label: string; set: (k: keyof F, v: any) => void; step?: string; hint?: string }) {
  return <div className="campo"><label htmlFor={k}>{label}</label>
    <input id={k} inputMode="decimal" type="number" step={step} value={f[k] as string} onChange={(e) => set(k, e.target.value)} />
    {hint && <p className="pista">{hint}</p>}</div>;
}
function Opciones({ f, k, label, set, ops }: { f: F; k: keyof F; label: string; set: (k: keyof F, v: any) => void; ops: [string, string, string?][] }) {
  return <fieldset className="campo"><legend className="mb-1.5 text-sm font-semibold text-verde-900">{label}</legend>
    <div className="grid gap-2 sm:grid-cols-2">{ops.map(([v, t, s]) => (
      <button type="button" key={v} aria-pressed={String(f[k]) === v} onClick={() => set(k, v)}
        className={`min-h-14 rounded-2xl border-2 px-4 py-2 text-left ${String(f[k]) === v ? 'border-verde-500 bg-verde-50' : 'border-verde-100 bg-white'}`}>
        <b className="block text-verde-900">{t}</b>{s && <span className="pista">{s}</span>}</button>))}</div></fieldset>;
}

export default function Wizard({ alias }: { alias: string }) {
  const [f, setF] = useState<F>(V0); const [paso, setPaso] = useState(0);
  const [err, setErr] = useState(''); const [pend, start] = useTransition();
  const set = (k: keyof F, v: any) => { setF((p) => ({ ...p, [k]: v })); setErr(''); };

  const req: (keyof F)[][] = [
    ['sexo', 'fecha_nacimiento', 'altura_cm'],
    ['peso_inicial_kg', 'pecho_cm', 'cintura_cm', 'cadera_cm', 'muslo_izq_cm', 'muslo_der_cm', 'biceps_izq_cm', 'biceps_der_cm', 'muneca_cm'],
    ['horas_sueno', 'hora_dormir', 'estres_1_5', 'actividad'],
    ['peso_deseado_kg', 'rigurosidad', 'comidas_por_dia'], [], [],
  ];
  const calc = useMemo(() => {
    if (!f.sexo || !f.fecha_nacimiento || !+f.altura_cm || !+f.muneca_cm || !+f.peso_inicial_kg || !f.actividad) return null;
    const edad = calcularEdad(new Date(f.fecha_nacimiento + 'T12:00:00')), sexo = f.sexo as 'masculino' | 'femenino';
    const comp = clasificarComplexion(sexo, +f.altura_cm, +f.muneca_cm);
    const plan = calcularPlanCalorico({ sexo, pesoKg: +f.peso_inicial_kg, alturaCm: +f.altura_cm, edad, actividad: f.actividad as any, rigurosidad: f.rigurosidad as any });
    return { edad, comp, ideal: pesoIdealMedico(sexo, +f.altura_cm, comp), plan };
  }, [f]);

  function siguiente() {
    const falta = req[paso].filter((k) => f[k] === '' || f[k] === undefined);
    if (falta.length) return setErr('Completa todos los campos para continuar.');
    if (paso === 0 && calcularEdad(new Date(f.fecha_nacimiento + 'T12:00:00')) < 18) return setErr('NutriPlot todavía no crea planes de adelgazamiento para menores de 18 años. Consulta a su pediatra.');
    setPaso(paso + 1); window.scrollTo(0, 0);
  }
  function confirmar() {
    start(async () => {
      const r = await confirmarDia0({ ...f, zona_horaria: Intl.DateTimeFormat().resolvedOptions().timeZone });
      if (r?.error) setErr(r.error);
    });
  }
  const titulos = ['Sobre ti', 'Peso y medidas', 'Tu día a día', 'Tus metas', 'Tu comida', 'Tu punto de partida'];
  const aviso = f.peso_deseado_kg && f.altura_cm ? validarPesoDeseado(+f.peso_deseado_kg, +f.altura_cm) : null;
  const mayor = calc && calc.edad >= 65;

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-5 px-4 py-6">
      <header><p className="pista">Hola, {alias}. Paso {paso + 1} de {titulos.length}</p><h1 className="text-3xl font-extrabold">{titulos[paso]}</h1>
        <div className="mt-3 flex gap-1.5" aria-hidden>{titulos.map((_, i) => <i key={i} className={`h-1.5 flex-1 rounded-full ${i <= paso ? 'bg-verde-500' : 'bg-verde-100'}`} />)}</div></header>

      <section className="card flex flex-col gap-4">
        {paso === 0 && <>
          <Opciones f={f} k="sexo" set={set} label="Sexo biológico" ops={[['masculino', 'Masculino'], ['femenino', 'Femenino']]} />
          <div className="campo"><label htmlFor="fn">Fecha de nacimiento</label><input id="fn" type="date" value={f.fecha_nacimiento} onChange={(e) => set('fecha_nacimiento', e.target.value)} /></div>
          <Num f={f} k="altura_cm" set={set} label="Altura (cm)" step="0.5" />
        </>}
        {paso === 1 && <>
          <Num f={f} k="peso_inicial_kg" set={set} label="Peso actual (kg)" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Num f={f} k="pecho_cm" set={set} label="Pecho (cm)" /><Num f={f} k="cintura_cm" set={set} label="Cintura (cm)" hint="A la altura del ombligo." />
            <Num f={f} k="cadera_cm" set={set} label="Cadera (cm)" /><Num f={f} k="muneca_cm" set={set} label="Muñeca (cm)" hint="Sirve para calcular tu complexión ósea." />
            <Num f={f} k="muslo_izq_cm" set={set} label="Muslo izquierdo (cm)" /><Num f={f} k="muslo_der_cm" set={set} label="Muslo derecho (cm)" />
            <Num f={f} k="biceps_izq_cm" set={set} label="Bíceps izquierdo (cm)" /><Num f={f} k="biceps_der_cm" set={set} label="Bíceps derecho (cm)" />
          </div>
        </>}
        {paso === 2 && <>
          <div className="grid gap-4 sm:grid-cols-2"><Num f={f} k="horas_sueno" set={set} label="Horas de sueño promedio" step="0.5" />
            <div className="campo"><label htmlFor="hd">Hora típica de dormir</label><input id="hd" type="time" value={f.hora_dormir} onChange={(e) => set('hora_dormir', e.target.value)} /></div></div>
          <div className="campo"><label htmlFor="es">Estrés percibido: {f.estres_1_5} de 5</label><input id="es" type="range" min="1" max="5" value={f.estres_1_5} onChange={(e) => set('estres_1_5', e.target.value)} className="!min-h-8 accent-verde-600" /></div>
          <Opciones f={f} k="actividad" set={set} label="Nivel de actividad física" ops={[['sedentario', 'Sedentario', 'Casi sin ejercicio'], ['ligero', 'Ligero', '1–3 días por semana'], ['moderado', 'Moderado', '3–5 días'], ['intenso', 'Intenso', '6–7 días'], ['hiperactivo', 'Hiperactivo', 'Entreno doble o trabajo físico duro']]} />
        </>}
        {paso === 3 && <>
          <Num f={f} k="peso_deseado_kg" set={set} label="Tu peso ideal deseado (kg)" hint="La meta que tú tienes en mente. Te mostraremos también el peso saludable médico." />
          {aviso && <p className="aviso">{aviso}</p>}
          {calc && <p className="pista">Peso ideal saludable médico para ti: <b>{calc.ideal.toFixed(1)} kg</b> (complexión {NC[calc.comp].toLowerCase()}).</p>}
          <Opciones f={f} k="rigurosidad" set={set} label="Nivel de rigurosidad" ops={[['flexible', 'Flexible', '≈ 0.25 kg por semana'], ['moderado', 'Moderado', '≈ 0.5 kg por semana'], ['estricto', 'Estricto', 'hasta 1 kg por semana, con tope de seguridad']]} />
          <Opciones f={f} k="comidas_por_dia" set={set} label="Comidas al día en tu plan" ops={[['2', '2 comidas', 'Almuerzo y cena'], ['3', '3 comidas', 'Desayuno, almuerzo y cena']]} />
          {mayor && <p className="aviso">A partir de los 65 años conviene bajar de peso despacio y cuidar el músculo. Comenta tu plan con tu médico o nutricionista.</p>}
        </>}
        {paso === 4 && <>
          <p className="pista">Así adaptamos las recetas a ti. Puedes cambiarlo después en Ajustes.</p>
          <Opciones f={f} k="evita_mariscos" set={set} label="Mariscos" ops={[['false', 'Los como'], ['true', 'Prefiero no comerlos', 'Es un gusto, no una alergia']].map(([v, t, s]) => [v, t, s] as any)} />
          <Opciones f={f} k="movilidad" set={set} label="Movilidad para cocinar y moverte" ops={[['normal', 'Normal'], ['reducida', 'Reducida', 'Me cuesta estar mucho tiempo de pie'], ['muy_reducida', 'Muy reducida', 'Necesito ayuda para cocinar']]} />
          <Opciones f={f} k="textura" set={set} label="Textura de la comida" ops={[['normal', 'Normal'], ['suave', 'Suave', 'Me cuesta masticar'], ['molida', 'Molida o picada fina']]} />
          <Opciones f={f} k="entrena_fuerza" set={set} label="Entrenamiento de fuerza" ops={[['false', 'No entreno fuerza'], ['true', 'Entreno fuerte en el gimnasio', 'Más proteína y porciones más grandes']]} />
        </>}
        {paso === 5 && calc && <>
          <dl className="grid gap-3 sm:grid-cols-2">
            {[['Peso inicial', `${(+f.peso_inicial_kg).toFixed(1)} kg`], ['Peso deseado', `${(+f.peso_deseado_kg).toFixed(1)} kg`], ['Peso ideal médico', `${calc.ideal.toFixed(1)} kg`],
              ['Complexión', NC[calc.comp]], ['Calorías al día', `${calc.plan.caloriasObjetivo} kcal`], ['Ritmo previsto', `${calc.plan.ritmoRealKgSemana} kg por semana`]].map(([a, b]) =>
              <div key={a} className="rounded-2xl bg-verde-50 p-4"><dt className="pista">{a}</dt><dd className="text-xl font-bold text-verde-900">{b}</dd></div>)}
          </dl>
          {calc.plan.limitadoPorSeguridad && <p className="aviso">Ajustamos tu ritmo para no bajar de un mínimo calórico seguro.</p>}
          <p className="pista">Al continuar, hoy queda como tu <b>Día 0</b>. Estos datos se congelan para comparar tu avance y no se pueden editar después.</p>
        </>}
        {err && <p className="error" role="alert">{err}</p>}
      </section>

      <div className="flex gap-3">
        {paso > 0 && <button className="btn-ghost" onClick={() => { setPaso(paso - 1); setErr(''); }}>Atrás</button>}
        {paso < 5 ? <button className="btn flex-1" onClick={siguiente}>Siguiente</button>
          : <button className="btn flex-1 !min-h-16 text-lg" onClick={confirmar} disabled={pend}>{pend ? 'Guardando…' : 'A partir de hoy quiero transformar mi cuerpo para siempre'}</button>}
      </div>
    </main>
  );
}
