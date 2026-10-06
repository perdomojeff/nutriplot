import Link from 'next/link';
import { cargarMiembro, estadoCheckin, fechaLarga, requerirPerfil } from '@/lib/datos';
import CheckinForm from './CheckinForm';

export const metadata = { title: 'Check-in semanal' };

export default async function Page() {
  const { sb, perfil } = await requerirPerfil();
  const { u, cks } = await cargarMiembro(sb, perfil.id);
  const est = estadoCheckin(u, cks);
  return (
    <>
      <header><h1 className="text-3xl font-extrabold">Check-in de la semana {est.siguienteSemana}</h1>
        <p className="pista">{est.vencido ? 'Todos los campos y las dos fotos son obligatorios. Al enviarlos se desbloquea tu plan.' : `Se abre el ${fechaLarga(est.due)}.`}</p></header>
      {est.vencido
        ? <>
            <div className="rounded-3xl bg-amber-50 p-5 ring-1 ring-amber-200"><b className="text-amber-900">Plan bloqueado</b><p className="pista">Faltan tus datos de la semana {est.siguienteSemana}. En cuanto los guardes, tu plan nuevo se abre.</p></div>
            <CheckinForm semana={est.siguienteSemana} familiaId={u.familia_id} usuarioId={u.id} />
          </>
        : <div className="card flex flex-col gap-3"><b className="text-xl text-verde-900">{cks.length ? `Semana ${est.ultimaSemana} completa.` : 'Día 0 completo.'} Tu plan está desbloqueado.</b>
            <p className="pista">Tu próximo check-in es el {fechaLarga(est.due)} (en {est.dias} {est.dias === 1 ? 'día' : 'días'}). Un día antes te avisamos si activaste los recordatorios en Ajustes.</p>
            <Link href="/plan" className="btn self-start">Ver plan de comidas</Link></div>}
    </>
  );
}
