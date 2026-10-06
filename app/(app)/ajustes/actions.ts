'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requerirPerfil, sesion } from '@/lib/datos';

export async function guardarPreferencias(fd: FormData) {
  const { sb, perfil } = await requerirPerfil();
  const t = (k: string) => String(fd.get(k) ?? '');
  await sb.from('usuarios').update({
    evita_mariscos: t('evita_mariscos') === 'true', entrena_fuerza: t('entrena_fuerza') === 'true',
    movilidad: ['normal', 'reducida', 'muy_reducida'].includes(t('movilidad')) ? t('movilidad') : 'normal',
    textura: ['normal', 'suave', 'molida'].includes(t('textura')) ? t('textura') : 'normal',
    comidas_por_dia: t('comidas_por_dia') === '2' ? 2 : 3, recordatorio_activo: t('recordatorio_activo') === 'on',
  }).eq('id', perfil.id);
  revalidatePath('/', 'layout');
}
export async function salir() { const { sb } = await sesion(); await sb.auth.signOut(); redirect('/login'); }
