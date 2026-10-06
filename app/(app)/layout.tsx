import { requerirPerfil } from '@/lib/datos';
import Nav from './Nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { perfil } = await requerirPerfil();
  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <Nav alias={perfil.alias} admin={perfil.rol === 'admin'} />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">{children}</main>
    </div>
  );
}
