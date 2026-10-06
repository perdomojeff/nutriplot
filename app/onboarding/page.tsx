import { redirect } from 'next/navigation';
import { sesion } from '@/lib/datos';
import Wizard from './Wizard';

export const metadata = { title: 'Tu punto de partida' };
export default async function Page() {
  const { perfil } = await sesion();
  if (!perfil) redirect('/bienvenida');
  if (perfil.fecha_inicio) redirect('/');
  return <Wizard alias={perfil.alias} />;
}
