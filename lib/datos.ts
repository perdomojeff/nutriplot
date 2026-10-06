import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseServer } from './supabase/server';
import { fechaProximoCheckin, hoyEnZona } from './recordatorios';

export const sesion = cache(async () => {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login');
  let { data: perfil } = await sb.from('usuarios').select('*').eq('auth_user_id', user.id).maybeSingle();
  if (!perfil) { // ¿me invitó un administrador con este correo?
    await sb.rpc('reclamar_perfil');
    ({ data: perfil } = await sb.from('usuarios').select('*').eq('auth_user_id', user.id).maybeSingle());
  }
  return { sb, user, perfil };
});

export async function requerirPerfil() {
  const s = await sesion();
  if (!s.perfil) redirect('/bienvenida');
  if (!s.perfil.fecha_inicio) redirect('/onboarding');
  return { ...s, perfil: s.perfil };
}

/** Datos de un miembro (yo o, si soy admin, otro de mi familia: RLS lo decide). */
export async function cargarMiembro(sb: SupabaseClient, id: string) {
  const [{ data: u }, { data: cks }] = await Promise.all([
    sb.from('usuarios').select('*').eq('id', id).maybeSingle(),
    sb.from('checkins_semanales').select('*').eq('usuario_id', id).order('semana'),
  ]);
  return { u, cks: cks ?? [] };
}

export const pesosReales = (u: any, cks: any[]) => [Number(u.peso_inicial_kg), ...cks.map((c) => Number(c.peso_kg))];

/** Estado del check-in: fecha del próximo, si ya venció sin hacerse, y días que faltan. */
export function estadoCheckin(u: any, cks: any[]) {
  const ult = cks.length ? Math.max(...cks.map((c) => c.semana)) : 0;
  const due = fechaProximoCheckin(u.fecha_inicio, ult);
  const hoy = hoyEnZona(u.zona_horaria || 'America/New_York');
  const dias = Math.round((Date.parse(due) - Date.parse(hoy)) / 864e5);
  return { ultimaSemana: ult, siguienteSemana: ult + 1, due, dias, vencido: dias <= 0 };
}
export const fechaLarga = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
