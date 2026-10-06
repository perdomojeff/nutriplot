// =====================================================================
// NutriPlot · Lógica clínica y motor de proyección
// =====================================================================

export type Sexo = 'masculino' | 'femenino';
export type Complexion = 'pequena' | 'mediana' | 'grande';
export type Actividad = 'sedentario' | 'ligero' | 'moderado' | 'intenso' | 'hiperactivo';
export type Rigurosidad = 'flexible' | 'moderado' | 'estricto';

const FACTOR_ACTIVIDAD: Record<Actividad, number> = {
  sedentario: 1.2, ligero: 1.375, moderado: 1.55, intenso: 1.725, hiperactivo: 1.9,
};

/** Ritmo objetivo de pérdida (kg/semana) según rigurosidad. */
export const RITMO_KG_SEMANA: Record<Rigurosidad, number> = {
  flexible: 0.25, moderado: 0.5, estricto: 1.0,
};

const KCAL_POR_KG_GRASA = 7700;
const PISO_CALORICO: Record<Sexo, number> = { masculino: 1500, femenino: 1200 };

export function calcularEdad(fechaNacimiento: Date, hoy = new Date()): number {
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const m = hoy.getMonth() - fechaNacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fechaNacimiento.getDate())) edad--;
  return edad;
}

/** Complexión ósea por índice altura/muñeca (r de Grant). */
export function clasificarComplexion(sexo: Sexo, alturaCm: number, munecaCm: number): Complexion {
  const r = alturaCm / munecaCm;
  if (sexo === 'masculino') return r > 10.4 ? 'pequena' : r >= 9.6 ? 'mediana' : 'grande';
  return r > 11.0 ? 'pequena' : r >= 10.1 ? 'mediana' : 'grande';
}

/** Mifflin-St Jeor: tasa metabólica basal (kcal/día). */
export function mifflinStJeor(sexo: Sexo, pesoKg: number, alturaCm: number, edad: number): number {
  const base = 10 * pesoKg + 6.25 * alturaCm - 5 * edad;
  return sexo === 'masculino' ? base + 5 : base - 161;
}

/** Gasto energético diario total (TDEE). */
export function tdee(bmr: number, actividad: Actividad): number {
  return bmr * FACTOR_ACTIVIDAD[actividad];
}

/** Devine: peso ideal base (kg). */
export function devine(sexo: Sexo, alturaCm: number): number {
  const pulgadasSobre60 = Math.max(0, alturaCm / 2.54 - 60);
  return (sexo === 'masculino' ? 50 : 45.5) + 2.3 * pulgadasSobre60;
}

/** Peso Ideal Saludable Médico = Devine ajustado ±10 % por complexión. */
export function pesoIdealMedico(sexo: Sexo, alturaCm: number, complexion: Complexion): number {
  const ajuste = complexion === 'pequena' ? 0.9 : complexion === 'grande' ? 1.1 : 1.0;
  const kg = devine(sexo, alturaCm) * ajuste;
  // Salvaguarda: nunca sugerir un IMC < 18.5
  const minimoIMC = 18.5 * (alturaCm / 100) ** 2;
  return round(Math.max(kg, minimoIMC), 1);
}

export interface PlanCalorico {
  bmr: number;
  tdee: number;
  deficitDiario: number;
  caloriasObjetivo: number;
  ritmoRealKgSemana: number; // puede ser menor al pedido si se activa el piso calórico
  limitadoPorSeguridad: boolean;
}

/** Déficit calórico con piso de seguridad (1200 F / 1500 M) y tope 1 % del peso/semana. */
export function calcularPlanCalorico(p: {
  sexo: Sexo; pesoKg: number; alturaCm: number; edad: number;
  actividad: Actividad; rigurosidad: Rigurosidad;
}): PlanCalorico {
  const bmr = mifflinStJeor(p.sexo, p.pesoKg, p.alturaCm, p.edad);
  const gasto = tdee(bmr, p.actividad);
  const ritmoPedido = Math.min(RITMO_KG_SEMANA[p.rigurosidad], p.pesoKg * 0.01);
  const deficitPedido = (ritmoPedido * KCAL_POR_KG_GRASA) / 7;
  const objetivo = Math.max(gasto - deficitPedido, PISO_CALORICO[p.sexo]);
  const deficitReal = gasto - objetivo;
  return {
    bmr: round(bmr, 0), tdee: round(gasto, 0),
    deficitDiario: round(deficitReal, 0),
    caloriasObjetivo: round(objetivo, 0),
    ritmoRealKgSemana: round((deficitReal * 7) / KCAL_POR_KG_GRASA, 2),
    limitadoPorSeguridad: objetivo > gasto - deficitPedido + 1,
  };
}

export interface PuntoProyeccion { semana: number; fecha: string; pesoKg: number }
export interface Proyeccion {
  puntos: PuntoProyeccion[];
  fechaMeta: string;      // ISO yyyy-mm-dd
  semanasTotales: number;
}

/** Curva predictiva lineal desde pesoActual hasta pesoMeta + fecha exacta de cumplimiento. */
export function proyectar(fechaInicio: Date, pesoActual: number, pesoMeta: number, ritmoKgSemana: number): Proyeccion {
  const diff = pesoActual - pesoMeta;
  if (diff <= 0 || ritmoKgSemana <= 0) {
    return { puntos: [{ semana: 0, fecha: iso(fechaInicio), pesoKg: pesoActual }], fechaMeta: iso(fechaInicio), semanasTotales: 0 };
  }
  const semanasExactas = diff / ritmoKgSemana;
  const puntos: PuntoProyeccion[] = [];
  for (let s = 0; s <= Math.ceil(semanasExactas); s++) {
    const peso = Math.max(pesoMeta, pesoActual - ritmoKgSemana * s);
    puntos.push({ semana: s, fecha: iso(addDias(fechaInicio, s * 7)), pesoKg: round(peso, 2) });
  }
  return {
    puntos,
    fechaMeta: iso(addDias(fechaInicio, Math.ceil(semanasExactas * 7))),
    semanasTotales: round(semanasExactas, 1),
  };
}

// =====================================================================
// Proyección DINÁMICA: se recalcula con cada check-in.
//  1. Parte del ÚLTIMO peso real (no del Día 0).
//  2. Ritmo observado = pendiente de mínimos cuadrados sobre las últimas 6 lecturas.
//  3. Ritmo usado = w · observado + (1 − w) · plan, con w = n / (n + 4)
//     (n = semanas registradas). Pocos datos → manda el plan; más datos → manda tu ritmo.
//  4. Tope de seguridad: máx. 1 % del peso actual por semana; mínimo 0.05 kg/sem.
//  5. Banda de incertidumbre ±(20 % + 40 % / (n + 1)) sobre el ritmo: más ancha con pocos datos.
// Las calorías diarias también deben recalcularse con el peso actual:
//   calcularPlanCalorico({ ..., pesoKg: ultimoPesoReal }).
// =====================================================================
const SEMANAS_MAX = 156; // 3 años

/** Pendiente de pérdida (kg/semana, positiva si bajas) por mínimos cuadrados. null si hay <2 lecturas. */
export function ritmoObservado(pesosSemanales: number[], ventana = 6): number | null {
  const ys = pesosSemanales.slice(-ventana);
  if (ys.length < 2) return null;
  const mx = (ys.length - 1) / 2;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let sxy = 0, sxx = 0;
  ys.forEach((y, i) => { sxy += (i - mx) * (y - my); sxx += (i - mx) ** 2; });
  return -sxy / sxx;
}

export interface ProyeccionDinamica {
  puntos: PuntoProyeccion[];     // desde el último peso real hasta la meta
  fechaMeta: string;             // estimación central
  fechaRapida: string;           // extremo optimista del rango
  fechaLenta: string;            // extremo pesimista del rango
  semanasRestantes: number;
  ritmoUsado: number;
  ritmoObservado: number | null;
  pesoRitmoObservado: number;    // w, entre 0 y 1
}

export function proyectarDinamico(p: {
  fechaInicio: Date;
  pesosReales: number[];         // índice = semana (0 = Día 0)
  pesoMeta: number;
  ritmoPlan: number;             // kg/semana del plan (rigurosidad, ya con tope calórico)
}): ProyeccionDinamica {
  const n = p.pesosReales.length - 1;
  const pesoActual = p.pesosReales[n];
  const obs = ritmoObservado(p.pesosReales);
  const w = n / (n + 4);
  const mezcla = obs === null ? p.ritmoPlan : w * obs + (1 - w) * p.ritmoPlan;
  const ritmo = Math.max(0.05, Math.min(mezcla, pesoActual * 0.01));
  const banda = 0.2 + 0.4 / (n + 1);
  const falta = Math.max(0, pesoActual - p.pesoMeta);

  const semCentral = Math.min(falta / ritmo, SEMANAS_MAX);
  const semRapida = Math.min(falta / (ritmo * (1 + banda)), SEMANAS_MAX);
  const semLenta = Math.min(falta / Math.max(0.03, ritmo * (1 - banda)), SEMANAS_MAX);
  const fechaEn = (sem: number) => iso(addDias(p.fechaInicio, Math.round((n + sem) * 7)));

  const puntos: PuntoProyeccion[] = [];
  for (let s = 0; s <= Math.ceil(semCentral); s++) {
    puntos.push({
      semana: n + s,
      fecha: iso(addDias(p.fechaInicio, (n + s) * 7)),
      pesoKg: round(Math.max(p.pesoMeta, pesoActual - ritmo * s), 2),
    });
  }
  return {
    puntos,
    fechaMeta: fechaEn(semCentral),
    fechaRapida: fechaEn(semRapida),
    fechaLenta: fechaEn(semLenta),
    semanasRestantes: round(semCentral, 1),
    ritmoUsado: round(ritmo, 2),
    ritmoObservado: obs === null ? null : round(obs, 2),
    pesoRitmoObservado: round(w, 2),
  };
}

/** Mensaje de advertencia si el peso deseado es poco saludable (IMC < 18.5). */
export function validarPesoDeseado(pesoDeseado: number, alturaCm: number): string | null {
  const imc = pesoDeseado / (alturaCm / 100) ** 2;
  return imc < 18.5
    ? `Tu peso deseado equivale a un IMC de ${imc.toFixed(1)} (bajo peso). Te sugerimos consultarlo con un profesional de salud.`
    : null;
}

// ---- utilidades ----
export const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const addDias = (d: Date, dias: number) => { const x = new Date(d); x.setDate(x.getDate() + dias); return x; };
