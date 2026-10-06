'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function Login() {
  const [modo, setModo] = useState<'entrar' | 'crear'>('entrar');
  const [email, setEmail] = useState(''); const [clave, setClave] = useState('');
  const [msg, setMsg] = useState<{ t: 'ok' | 'err'; x: string } | null>(null);
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  async function enviar(e: React.FormEvent) {
    e.preventDefault(); setCargando(true); setMsg(null);
    const sb = supabaseBrowser();
    if (modo === 'entrar') {
      const { error } = await sb.auth.signInWithPassword({ email, password: clave });
      if (error) setMsg({ t: 'err', x: error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error.message });
      else { router.replace('/'); router.refresh(); }
    } else {
      const { error } = await sb.auth.signUp({ email, password: clave, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
      if (error) setMsg({ t: 'err', x: error.message });
      else setMsg({ t: 'ok', x: 'Te enviamos un correo. Ábrelo y toca el enlace para confirmar tu cuenta.' });
    }
    setCargando(false);
  }
  async function olvide() {
    if (!email) return setMsg({ t: 'err', x: 'Escribe tu correo arriba y vuelve a tocar aquí.' });
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/callback?next=/ajustes` });
    setMsg(error ? { t: 'err', x: error.message } : { t: 'ok', x: 'Si el correo existe, te enviamos un enlace para cambiar la contraseña.' });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="flex items-center gap-3">
        <img src="/icon.svg" alt="" className="h-12 w-12" />
        <div><h1 className="text-3xl font-extrabold">NutriPlot</h1><p className="pista">Tu familia, paso a paso hacia una vida más saludable.</p></div>
      </div>
      <form onSubmit={enviar} className="card flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-verde-50 p-1">
          {(['entrar', 'crear'] as const).map((m) => (
            <button type="button" key={m} onClick={() => { setModo(m); setMsg(null); }} aria-pressed={modo === m}
              className={`min-h-11 rounded-xl font-semibold ${modo === m ? 'bg-white text-verde-900 shadow-sm' : 'text-verde-700'}`}>{m === 'entrar' ? 'Entrar' : 'Crear cuenta'}</button>
          ))}
        </div>
        <div className="campo"><label htmlFor="email">Correo</label><input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="campo"><label htmlFor="clave">Contraseña</label><input id="clave" type="password" required minLength={8} autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} value={clave} onChange={(e) => setClave(e.target.value)} />
          {modo === 'crear' && <p className="pista">Mínimo 8 caracteres.</p>}</div>
        {msg && <p className={msg.t === 'ok' ? 'aviso' : 'error'} role="status">{msg.x}</p>}
        <button className="btn" disabled={cargando}>{cargando ? 'Un momento…' : modo === 'entrar' ? 'Entrar' : 'Crear mi cuenta'}</button>
        {modo === 'entrar' && <button type="button" onClick={olvide} className="pista underline">Olvidé mi contraseña</button>}
        {modo === 'crear' && <p className="pista">Si alguien de tu familia te invitó, crea tu cuenta con el mismo correo con el que te invitó y entrarás directo a tu perfil.</p>}
      </form>
    </main>
  );
}
