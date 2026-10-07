import { redirect } from 'next/navigation';
import { sesion } from '@/lib/datos';

async function crear(fd: FormData) {
  'use server';
  const { sb, perfil } = await sesion();
  if (perfil) redirect('/');
  const nombre = String(fd.get('familia') || '').trim(), alias = String(fd.get('alias') || '').trim();
  if (!nombre || !alias) return;
  const { error } = await sb.rpc('crear_familia', { p_nombre: nombre, p_alias: alias });
  if (error) throw new Error(error.message);
  redirect('/onboarding');
}

async function salir() {
  'use server';
  const { sb } = await sesion();
  await sb.auth.signOut();
  redirect('/login');
}

export default async function Bienvenida() {
  const { perfil, user } = await sesion();
  if (perfil) redirect(perfil.fecha_inicio ? '/' : '/onboarding');
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div><h1 className="text-3xl font-extrabold">No encontramos tu invitación</h1>
        <p className="pista mt-2">Entraste con <b>{user.email}</b>, pero ese correo no tiene una invitación de ninguna familia. Si alguien de tu familia te invitó, pídele que revise que te agregó con este mismo correo, o cierra sesión y entra con el correo correcto.</p></div>
      <form action={salir} className="card flex flex-col gap-3">
        <button className="btn">Cerrar sesión y probar con otro correo</button>
      </form>
      <details className="card">
        <summary className="cursor-pointer font-semibold text-verde-900">Soy el primero de mi familia: quiero crear el espacio familiar</summary>
        <form action={crear} className="mt-4 flex flex-col gap-4">
          <p className="pista">Tú serás el administrador: podrás invitar a los demás y ver el avance de todos. Cada persona entra con su propia cuenta y ve solo lo suyo.</p>
          <div className="campo"><label htmlFor="familia">Nombre de la familia</label><input id="familia" name="familia" required maxLength={60} placeholder="Familia Pérez" /></div>
          <div className="campo"><label htmlFor="alias">Tu nombre o apodo</label><input id="alias" name="alias" required maxLength={40} placeholder="Jeff" /></div>
          <button className="btn">Crear mi familia</button>
        </form>
      </details>
    </main>
  );
}
