-- Endurecimiento para producción (ejecutar al final)

-- 1) Las funciones auxiliares solo las usa gente con sesión; nadie anónimo puede llamarlas por la API.
revoke execute on function public.mi_perfil_id(), public.mi_familia(), public.familia_de(uuid),
  public.soy_admin_de(uuid), public.puedo_ver(uuid), public.crear_familia(text,text), public.reclamar_perfil()
  from public, anon;
grant execute on function public.mi_perfil_id(), public.mi_familia(), public.familia_de(uuid),
  public.soy_admin_de(uuid), public.puedo_ver(uuid), public.crear_familia(text,text), public.reclamar_perfil()
  to authenticated;
revoke execute on function public.proteger_campos_usuario(), public.congelar_dia0() from public, anon, authenticated;

-- 2) Regla de los 7 días en la base de datos (no solo en la pantalla):
--    el check-in N solo se puede crear en orden y a partir de fecha_inicio + 7·N días.
create or replace function public.validar_checkin()
returns trigger language plpgsql security definer set search_path = public as $$
declare ini date; ult int; zona text; hoy date;
begin
  select fecha_inicio, zona_horaria into ini, zona from public.usuarios where id = new.usuario_id;
  if ini is null then raise exception 'Primero completa tu Día 0'; end if;
  select coalesce(max(semana), 0) into ult from public.checkins_semanales where usuario_id = new.usuario_id;
  if new.semana <> ult + 1 then raise exception 'Te toca el check-in de la semana %', ult + 1; end if;
  hoy := (now() at time zone coalesce(zona, 'America/New_York'))::date;
  if hoy < ini + 7 * new.semana then
    raise exception 'El check-in de la semana % se abre el %', new.semana, ini + 7 * new.semana;
  end if;
  new.fecha_registro := hoy;
  return new;
end $$;
revoke execute on function public.validar_checkin() from public, anon, authenticated;

create trigger trg_validar_checkin before insert on public.checkins_semanales
  for each row execute function public.validar_checkin();

-- 3) Las fotos de un check-in deben estar dentro de la carpeta de esa persona.
alter table public.checkins_semanales
  add constraint fotos_en_su_carpeta check (
    foto_frente_path like '%/' || usuario_id::text || '/semana-' || semana::text || '/%'
    and foto_costado_path like '%/' || usuario_id::text || '/semana-' || semana::text || '/%');

-- 4) Funciones auxiliares en esquema privado (no expuestas como API)
--    Aplicado en producción como migración "04_funciones_auxiliares_privadas".
--    (alter function ... set schema private; y se reescribe puedo_ver / proteger_campos_usuario)

-- 5) Plan N = datos de la semana N-1 (el plan 1 con el Día 0); se bloquea si vence el check-in N sin hacerlo.
create or replace function private.plan_desbloqueado(uid uuid, sem int)
returns boolean language sql stable security definer set search_path = public as $$
  select u.fecha_inicio is not null
     and (sem = 1 or exists (select 1 from public.checkins_semanales c where c.usuario_id = uid and c.semana = sem - 1))
     and (exists (select 1 from public.checkins_semanales c where c.usuario_id = uid and c.semana = sem)
          or (now() at time zone u.zona_horaria)::date < u.fecha_inicio + 7 * sem)
  from public.usuarios u where u.id = uid;
$$;
