import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { MENSAJE_RECORDATORIO, esVisperaDeCheckin, horaEnZona, fechaProximoCheckin } from '@/lib/recordatorios';

export const dynamic = 'force-dynamic';
const HORA_AVISO = 18; // hora local en que se envía (6 p. m.). Con cron diario se envía en la primera ejecución a partir de esa hora.

export async function GET(req: Request) {
  // Vercel Cron envía "Authorization: Bearer <CRON_SECRET>" automáticamente.
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse('No autorizado', { status: 401 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.VAPID_PRIVATE_KEY) return NextResponse.json({ error: 'Falta SUPABASE_SERVICE_ROLE_KEY o VAPID_PRIVATE_KEY en Vercel' }, { status: 503 });
  webpush.setVapidDetails('mailto:' + process.env.VAPID_CONTACTO!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: usuarios } = await sb.from('usuarios')
    .select('id, fecha_inicio, zona_horaria')
    .not('fecha_inicio', 'is', null).eq('recordatorio_activo', true);
  if (!usuarios?.length) return NextResponse.json({ enviados: 0 });

  const ids = usuarios.map((u) => u.id);
  const [{ data: cks }, { data: subs }] = await Promise.all([
    sb.from('checkins_semanales').select('usuario_id, semana').in('usuario_id', ids),
    sb.from('push_suscripciones').select('usuario_id, endpoint, p256dh, auth').in('usuario_id', ids),
  ]);
  const ultima = new Map<string, number>();
  cks?.forEach((c) => ultima.set(c.usuario_id, Math.max(ultima.get(c.usuario_id) ?? 0, c.semana)));

  let enviados = 0;
  for (const u of usuarios) {
    const sem = ultima.get(u.id) ?? 0;
    if (!esVisperaDeCheckin(u.fecha_inicio, sem, u.zona_horaria) || horaEnZona(u.zona_horaria) < HORA_AVISO) continue;

    // Marca primero: si dos ejecuciones se cruzan, solo una inserta y envía.
    const { error: dup } = await sb.from('recordatorios_enviados')
      .insert({ usuario_id: u.id, para_fecha: fechaProximoCheckin(u.fecha_inicio, sem) });
    if (dup) continue;

    for (const s of subs?.filter((x) => x.usuario_id === u.id) ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ ...MENSAJE_RECORDATORIO, url: '/checkin' }),
        );
        enviados++;
      } catch (e: any) {
        if (e.statusCode === 404 || e.statusCode === 410) await sb.from('push_suscripciones').delete().eq('endpoint', s.endpoint); // dispositivo dado de baja
      }
    }
  }
  return NextResponse.json({ enviados });
}
