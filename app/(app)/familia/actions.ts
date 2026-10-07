'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requerirPerfil } from '@/lib/datos';

/** Reserva el perfil de un familiar. No envía ningún correo: el familiar crea su cuenta con ese mismo correo. */
export async function invitar(fd: FormData): Promise<void> {
  const { sb, perfil } = await requerirPerfil();
  if (perfil.rol !== 'admin') return;
  const alias = String(fd.get('alias') || '').trim(), email = String(fd.get('email') || '').trim().toLowerCase();
  if (!alias || !/^\S+@\S+\.\S+$/.test(email)) redirect('/familia?msg=invalido');
  const { data: ya } = await sb.from('usuarios').select('id').eq('email_invitacion', email).limit(1);
  if (ya?.length) redirect('/familia?msg=duplicado');
  const { error } = await sb.from('usuarios').insert({ familia_id: perfil.familia_id, alias, email_invitacion: email, rol: 'miembro' });
  if (error) redirect('/familia?msg=' + (error.code === '23505' ? 'duplicado' : 'error'));
  revalidatePath('/familia');
  redirect('/familia?msg=ok&para=' + encodeURIComponent(alias));
}

/** Cancela una invitación que todavía no fue aceptada (la persona no ha creado su cuenta). */
export async function cancelarInvitacion(fd: FormData): Promise<void> {
  const { sb, perfil } = await requerirPerfil();
  if (perfil.rol !== 'admin') return;
  const id = String(fd.get('id') || '');
  await sb.from('usuarios').delete().eq('id', id).eq('familia_id', perfil.familia_id).is('auth_user_id', null).is('fecha_inicio', null);
  revalidatePath('/familia');
  redirect('/familia?msg=cancelada');
}
