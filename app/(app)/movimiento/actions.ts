'use server';
import { revalidatePath } from 'next/cache';
import { requerirPerfil } from '@/lib/datos';

export async function guardarPasos(fd: FormData) {
  const { sb, perfil } = await requerirPerfil();
  const pasos = Math.round(Number(fd.get('pasos')));
  if (!Number.isFinite(pasos) || pasos < 0 || pasos > 300000) return;
  const { data: ult } = await sb.from('checkins_semanales').select('id').eq('usuario_id', perfil.id).order('semana', { ascending: false }).limit(1).maybeSingle();
  if (ult) await sb.from('checkins_semanales').update({ pasos_semana: pasos }).eq('id', ult.id);
  revalidatePath('/movimiento');
}
