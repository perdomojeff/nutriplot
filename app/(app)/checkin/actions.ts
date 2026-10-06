'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requerirPerfil } from '@/lib/datos';
import { checkinSchema } from '@/lib/checkin-schema';
import { generarPlan } from '@/lib/plan';

export async function registrarCheckin(semana: number, datos: unknown): Promise<{ error: string }> {
  const { sb, perfil } = await requerirPerfil();
  const p = checkinSchema.safeParse(datos);
  if (!p.success) return { error: 'Revisa los datos: todos son obligatorios y deben tener valores posibles.' };
  const base = `${perfil.familia_id}/${perfil.id}/semana-${semana}`;

  // Las 2 fotos deben existir ya en el almacenamiento (las sube el navegador con tu sesión).
  const { data: archivos } = await sb.storage.from('fotos-progreso').list(base);
  const nombres = new Set((archivos ?? []).map((a) => a.name));
  if (!nombres.has('frente.jpg') || !nombres.has('costado.jpg')) return { error: 'Faltan las dos fotos (frente y costado).' };

  const { error } = await sb.from('checkins_semanales').insert({
    usuario_id: perfil.id, semana, ...p.data, foto_frente_path: `${base}/frente.jpg`, foto_costado_path: `${base}/costado.jpg`,
  });
  if (error) return { error: error.message };

  await generarPlan(sb, perfil, semana + 1, p.data.peso_kg);   // desbloquea el plan de la semana siguiente
  revalidatePath('/', 'layout');
  redirect('/plan');
}
