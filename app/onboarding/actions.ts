'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { sesion } from '@/lib/datos';
import { generarPlan } from '@/lib/plan';
import { calcularEdad, calcularPlanCalorico, clasificarComplexion, pesoIdealMedico } from '@/lib/calculos';
import { hoyEnZona } from '@/lib/recordatorios';

const n = (min: number, max: number) => z.coerce.number().min(min).max(max);
const esquema = z.object({
  sexo: z.enum(['masculino', 'femenino']), fecha_nacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), altura_cm: n(100, 230),
  peso_inicial_kg: n(30, 300), pecho_cm: n(40, 250), cintura_cm: n(30, 250), cadera_cm: n(40, 250),
  muslo_izq_cm: n(20, 120), muslo_der_cm: n(20, 120), biceps_izq_cm: n(10, 80), biceps_der_cm: n(10, 80), muneca_cm: n(10, 25),
  horas_sueno: n(2, 14), hora_dormir: z.string().regex(/^\d{2}:\d{2}$/), estres_1_5: n(1, 5),
  actividad: z.enum(['sedentario', 'ligero', 'moderado', 'intenso', 'hiperactivo']),
  peso_deseado_kg: n(30, 300), rigurosidad: z.enum(['flexible', 'moderado', 'estricto']), comidas_por_dia: z.coerce.number().refine((v) => v === 2 || v === 3),
  evita_mariscos: z.preprocess((v) => v === true || v === 'true', z.boolean()), entrena_fuerza: z.preprocess((v) => v === true || v === 'true', z.boolean()),
  movilidad: z.enum(['normal', 'reducida', 'muy_reducida']), textura: z.enum(['normal', 'suave', 'molida']),
  zona_horaria: z.string().max(60).default('America/New_York'),
});

export async function confirmarDia0(datos: unknown): Promise<{ error: string } | never> {
  const { sb, perfil } = await sesion();
  if (!perfil) redirect('/bienvenida');
  if (perfil.fecha_inicio) redirect('/');
  const p = esquema.safeParse(datos);
  if (!p.success) return { error: 'Revisa los datos: hay valores fuera de rango o vacíos.' };
  const d = p.data;
  const edad = calcularEdad(new Date(d.fecha_nacimiento + 'T12:00:00'));
  if (edad < 18) return { error: 'NutriPlot todavía no crea planes de adelgazamiento para menores de 18 años. Consulta a su pediatra.' };

  let zona = d.zona_horaria;
  try { hoyEnZona(zona); } catch { zona = 'America/New_York'; }
  const complexion = clasificarComplexion(d.sexo, d.altura_cm, d.muneca_cm);
  const ideal = pesoIdealMedico(d.sexo, d.altura_cm, complexion);
  const cal = calcularPlanCalorico({ sexo: d.sexo, pesoKg: d.peso_inicial_kg, alturaCm: d.altura_cm, edad, actividad: d.actividad, rigurosidad: d.rigurosidad });
  const { zona_horaria: _z, ...resto } = d;

  const { data: u, error } = await sb.from('usuarios').update({
    ...resto, complexion, peso_ideal_medico_kg: ideal, calorias_objetivo: cal.caloriasObjetivo,
    zona_horaria: zona, fecha_inicio: hoyEnZona(zona),   // congela el Día 0
  }).eq('id', perfil.id).select('*').single();
  if (error || !u) return { error: error?.message ?? 'No pudimos guardar tu Día 0.' };

  await generarPlan(sb, u, 1, d.peso_inicial_kg);   // el plan de la semana 1 está listo desde el Día 0
  redirect('/');
}
