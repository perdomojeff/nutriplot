// Genera el plan semanal personalizado (7 días) a partir del recetario y de las calorías actuales de la persona.
import type { SupabaseClient } from '@supabase/supabase-js';
import { calcularPlanCalorico, calcularEdad } from './calculos';
import { RECETAS, type PerfilId } from './recetas';

export const VERSION_PLAN = 2;   // 2 = 7 días con recetas distintas (rotan entre 7 desayunos, 7 almuerzos y 7 cenas)

const REPARTO: Record<number, { tipo: 'Desayuno' | 'Almuerzo' | 'Cena'; pct: number }[]> = {
  3: [{ tipo: 'Desayuno', pct: .27 }, { tipo: 'Almuerzo', pct: .36 }, { tipo: 'Cena', pct: .37 }],
  2: [{ tipo: 'Almuerzo', pct: .5 }, { tipo: 'Cena', pct: .5 }],
};

export function perfilDe(u: { textura?: string; movilidad?: string; entrena_fuerza?: boolean }): PerfilId {
  if ((u.textura && u.textura !== 'normal') || (u.movilidad && u.movilidad !== 'normal')) return 'mayor';
  return u.entrena_fuerza ? 'atleta' : 'std';
}

export async function generarPlan(sb: SupabaseClient, u: any, semana: number, pesoActual: number) {
  const edad = calcularEdad(new Date(u.fecha_nacimiento + 'T12:00:00'));
  const cal = calcularPlanCalorico({ sexo: u.sexo, pesoKg: pesoActual, alturaCm: Number(u.altura_cm), edad, actividad: u.actividad, rigurosidad: u.rigurosidad });
  const comidas = u.comidas_por_dia === 2 ? 2 : 3, perfil = perfilDe(u);
  // Cada franja (desayuno/almuerzo/cena) tiene su propio grupo de recetas. Dentro de la semana ningún plato se repite,
  // y de una semana a otra el orden se desplaza para que el plan nunca empiece igual.
  const grupos = new Map<string, any[]>();
  const pool = (tipo: string) => {
    if (!grupos.has(tipo)) grupos.set(tipo, (RECETAS as any[]).filter((r) => r.meal === tipo));
    return grupos.get(tipo)!;
  };
  const dias = Array.from({ length: 7 }, (_, d) => ({
    dia: d + 1,
    comidas: REPARTO[comidas].map((m, i) => {
      const rs = pool(m.tipo), r = rs[(d + (semana - 1) * 3) % rs.length];
      let vars = r.variants.filter((v: any) => !(u.evita_mariscos && v.sea));
      if (perfil !== 'std') { const ricas = vars.filter((v: any) => v.p >= 25); if (ricas.length) vars = ricas; }   // quien necesita proteger músculo prefiere variantes con más proteína
      const v = vars[(d + i + semana) % vars.length];
      const porcion = Math.min(1.8, Math.max(.6, Math.round(((cal.caloriasObjetivo * m.pct) / v.kcal) * 20) / 20));
      return { tipo: m.tipo, receta: r.id, variante: v.id, porcion, perfil };
    }),
  }));
  await sb.from('usuarios').update({ calorias_objetivo: cal.caloriasObjetivo }).eq('id', u.id);
  // upsert: si el plan de esa semana ya existía (p. ej. de una versión anterior del recetario) se reemplaza.
  const { error } = await sb.from('planes_alimentacion').upsert({
    usuario_id: u.id, semana, comidas_por_dia: comidas, calorias_dia: cal.caloriasObjetivo,
    contenido: { version: VERSION_PLAN, dias }, perfil_aplicado: { perfil, evita_mariscos: !!u.evita_mariscos, peso_base_kg: pesoActual },
  }, { onConflict: 'usuario_id,semana' });
  if (error) throw new Error(error.message);
}
