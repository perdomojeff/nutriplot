'use client';
import { useEffect, useState } from 'react';
import { activarRecordatorios, desactivarRecordatorios, estadoPush, type EstadoPush } from '@/lib/push-cliente';

export default function PushToggle() {
  const [e, setE] = useState<EstadoPush | null>(null); const [msg, setMsg] = useState('');
  useEffect(() => { estadoPush().then(setE); }, []);
  if (e === null) return null;
  return (
    <div className="flex flex-col gap-2">
      {e === 'no-soportado' && <p className="aviso">Este dispositivo no admite notificaciones. En iPhone o iPad, abre NutriPlot desde Safari, toca Compartir y elige «Agregar a pantalla de inicio»; luego vuelve aquí.</p>}
      {e === 'denegado' && <p className="aviso">Las notificaciones están bloqueadas. Actívalas en los ajustes del navegador para este sitio.</p>}
      {(e === 'activo' || e === 'inactivo') && (
        <button type="button" className={e === 'activo' ? 'btn-ghost' : 'btn'} onClick={async () => {
          try { if (e === 'activo') { await desactivarRecordatorios(); setE('inactivo'); setMsg('Recordatorios desactivados en este dispositivo.'); } else { setE(await activarRecordatorios()); setMsg('Listo. Te avisaremos un día antes de tu check-in.'); } }
          catch { setMsg('No pudimos activar los avisos. Intenta de nuevo.'); }
        }}>{e === 'activo' ? 'Desactivar avisos en este dispositivo' : 'Activar avisos en este dispositivo'}</button>)}
      {msg && <p className="pista" role="status">{msg}</p>}
    </div>
  );
}
