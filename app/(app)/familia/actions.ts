'use server';
import { revalidatePath } from 'next/cache';
import { requerirPerfil } from '@/lib/datos';

export async function invitar(fd: FormData): Promise<void> {
  const { sb, perfil } = await requerirPerfil();
  if (perfil.rol !== 'admin') return;
  const alias = String(fd.get('alias') || '').trim(), email = String(fd.get('email') || '').trim().toLowerCase();
  if (!alias || !/^\S+@\S+\.\S+$/.test(email)) return;
  await sb.from('usuarios').insert({ familia_id: perfil.familia_id, alias, email_invitacion: email, rol: 'miembro' });
  revalidatePath('/familia');
}
