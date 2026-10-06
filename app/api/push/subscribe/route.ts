import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Usa la sesión de quien llama (RLS): solo puede guardar dispositivos de su propio perfil.
async function cliente() {
  const c = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => c.getAll(), setAll: () => {} },
  });
}

export async function POST(req: Request) {
  const sub = await req.json();
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });
  const sb = await cliente();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sin sesión' }, { status: 401 });
  const { data: yo } = await sb.from('usuarios').select('id').eq('auth_user_id', user.id).single();
  if (!yo) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
  const { error } = await sb.from('push_suscripciones').upsert(
    { usuario_id: yo.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, user_agent: req.headers.get('user-agent') },
    { onConflict: 'endpoint' },
  );
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { endpoint } = await req.json();
  const sb = await cliente();
  await sb.from('push_suscripciones').delete().eq('endpoint', endpoint); // RLS limita a los propios
  return NextResponse.json({ ok: true });
}
