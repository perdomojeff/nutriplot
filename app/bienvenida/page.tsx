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

export default async function Bienvenida() {
  const { perfil } = await sesion();
  if (perfil) redirect(perfil.fecha_inicio ? '/' : '/onboarding');
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div><h1 className="text-3xl font-extrabold">Bienvenido a NutriPlot</h1>
        <p className="pista mt-2">Crea el espacio de tu familia. Tú serás el administrador: podrás invitar a los demás y ver el avance de todos. Cada persona entra con su propia cuenta y ve solo lo suyo.</p></div>
      <form action={crear} className="card flex flex-col gap-4">
        <div className="campo"><label htmlFor="familia">Nombre de la familia</label><input id="familia" name="familia" required maxLength={60} placeholder="Familia Pérez" /></div>
        <div className="campo"><label htmlFor="alias">Tu nombre o apodo</label><input id="alias" name="alias" required maxLength={40} placeholder="Jeff" /></div>
        <button className="btn">Crear mi familia</button>
        <p className="pista">¿Te invitó alguien? Cierra sesión y crea tu cuenta con el correo con el que te invitaron.</p>
      </form>
    </main>
  );
}
