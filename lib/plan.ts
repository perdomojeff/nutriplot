// Genera el plan semanal personalizado (7 días) a partir del recetario y de las calorías actuales de la persona.
import type { SupabaseClient } from '@supabase/supabase-js';
import { calcularPlanCalorico, calcularEdad } from './calculos';
import { RECETAS, type PerfilId } from './recetas';

const REPARTO: Record<number, { tipo: string; receta: string; pct: number }[]> = {
  3: [{ tipo: 'Desayuno', receta: 'pericos', pct: .27 }, { tipo: 'Almuerzo', receta: 'bowl', pct: .36 }, { tipo: 'Cena', receta: 'salteado', pct: .37 }],
  2: [{ tipo: 'Almuerzo', receta: 'bowl', pct: .5 }, { tipo: 'Cena', receta: 'salteado', pct: .5 }],
};

export function perfilDe(u: { textura?: string; movilidad?: string; entrena_fuerza?: boolean }): PerfilId {
  if ((u.textura && u.textura !== 'normal') || (u.movilidad && u.movilidad !== 'normal')) return 'mayor';
  return u.entrena_fuerza ? 'atleta' : 'std';
}

export async function generarPlan(sb: SupabaseClient, u: any, semana: number, pesoActual: number) {
  const edad = calcularEdad(new Date(u.fecha_nacimiento + 'T12:00:00'));
  const cal = calcularPlanCalorico({ sexo: u.sexo, pesoKg: pesoActual, alturaCm: Number(u.altura_cm), edad, actividad: u.actividad, rigurosidad: u.rigurosidad });
  const comidas = u.comidas_por_dia === 2 ? 2 : 3, perfil = perfilDe(u);
  const dias = Array.from({ length: 7 }, (_, d) => ({
    dia: d + 1,
    comidas: REPARTO[comidas].map((m, i) => {
      const r: any = RECETAS.find((x: any) => x.id === m.receta);
      const vars = r.variants.filter((v: any) => !(u.evita_mariscos && v.sea));
      const v = vars[(d + i + semana) % vars.length];
      const porcion = Math.min(1.8, Math.max(.6, Math.round(((cal.caloriasObjetivo * m.pct) / v.kcal) * 20) / 20));
      return { tipo: m.tipo, receta: m.receta, variante: v.id, porcion, perfil };
    }),
  }));
  await sb.from('usuarios').update({ calorias_objetivo: cal.caloriasObjetivo }).eq('id', u.id);
  const { error } = await sb.from('planes_alimentacion').insert({
    usuario_id: u.id, semana, comidas_por_dia: comidas, calorias_dia: cal.caloriasObjetivo,
    contenido: { dias }, perfil_aplicado: { perfil, evita_mariscos: !!u.evita_mariscos, peso_base_kg: pesoActual },
  });
  if (error && error.code !== '23505') throw new Error(error.message);   // 23505 = el plan de esa semana ya existía
}
