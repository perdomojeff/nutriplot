-- =====================================================================
-- NutriPlot · Esquema Supabase (PostgreSQL)
-- Modelo: UNA familia -> VARIOS miembros, cada uno con su PROPIO login.
--   · rol 'admin'   : ve y edita a toda la familia
--   · rol 'miembro' : solo ve y edita su propia sesión
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
create type sexo_biologico   as enum ('masculino', 'femenino');
create type complexion_osea  as enum ('pequena', 'mediana', 'grande');
create type nivel_actividad  as enum ('sedentario', 'ligero', 'moderado', 'intenso', 'hiperactivo');
create type rigurosidad      as enum ('flexible', 'moderado', 'estricto');
create type rol_familiar     as enum ('admin', 'miembro');

-- ---------- 0. FAMILIAS ----------
create table public.familias (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null check (char_length(nombre) between 1 and 60),
  creado_en timestamptz not null default now()
);

-- ---------- 1. USUARIOS (un perfil por persona) ----------
-- El admin crea el perfil con alias + correo. La persona se registra con ese
-- correo y reclama su perfil (función reclamar_perfil). Hasta entonces
-- auth_user_id es NULL. Los datos del Día 0 se completan después, por eso son
-- NULL al inicio; fecha_inicio IS NOT NULL significa "Día 0 completado".
create table public.usuarios (
  id                 uuid primary key default gen_random_uuid(),
  familia_id         uuid not null references public.familias(id) on delete cascade,
  auth_user_id       uuid unique references auth.users(id) on delete set null,
  email_invitacion   text,
  rol                rol_familiar not null default 'miembro',
  alias              text not null check (char_length(alias) between 1 and 40),
  sexo               sexo_biologico,
  fecha_nacimiento   date,
  altura_cm          numeric(5,1) check (altura_cm between 100 and 230),

  -- Día 0
  peso_inicial_kg    numeric(5,2) check (peso_inicial_kg between 30 and 300),
  pecho_cm           numeric(5,1),
  cintura_cm         numeric(5,1),
  cadera_cm          numeric(5,1),
  muslo_izq_cm       numeric(5,1),
  muslo_der_cm       numeric(5,1),
  biceps_izq_cm      numeric(5,1),
  biceps_der_cm      numeric(5,1),
  muneca_cm          numeric(4,1) check (muneca_cm between 10 and 25),
  complexion         complexion_osea,

  -- Estilo de vida
  horas_sueno        numeric(3,1) check (horas_sueno between 2 and 14),
  hora_dormir        time,
  estres_1_5         smallint check (estres_1_5 between 1 and 5),
  actividad          nivel_actividad,

  -- Metas
  peso_deseado_kg    numeric(5,2) check (peso_deseado_kg between 30 and 300),
  peso_ideal_medico_kg numeric(5,2),                     -- calculado (Devine + complexión)
  rigurosidad        rigurosidad,
  comidas_por_dia    smallint not null default 3 check (comidas_por_dia in (2,3)),
  calorias_objetivo  integer,                            -- calculado (TDEE - déficit)

  -- Punto de partida ("A partir de hoy quiero transformar mi cuerpo para siempre")
  fecha_inicio       date,
  creado_en          timestamptz not null default now()
);
create index on public.usuarios(familia_id);
create unique index un_admin_por_login on public.usuarios(auth_user_id) where auth_user_id is not null;

-- ---------- 2. CHECK-INS SEMANALES ----------
create table public.checkins_semanales (
  id               uuid primary key default gen_random_uuid(),
  usuario_id       uuid not null references public.usuarios(id) on delete cascade,
  semana           integer not null check (semana >= 1),
  fecha_registro   date not null default current_date,

  peso_kg          numeric(5,2) not null,
  masa_muscular_pct numeric(4,1) not null check (masa_muscular_pct between 5 and 80),
  grasa_subcutanea_pct numeric(4,1) not null check (grasa_subcutanea_pct between 2 and 70),
  grasa_visceral   numeric(4,1) not null check (grasa_visceral between 1 and 60),

  pecho_cm         numeric(5,1) not null,
  cintura_cm       numeric(5,1) not null,
  cadera_cm        numeric(5,1) not null,
  muslo_cm         numeric(5,1) not null,
  biceps_cm        numeric(5,1) not null,

  foto_frente_path  text not null,   -- ruta en Storage
  foto_costado_path text not null,

  pasos_semana     integer check (pasos_semana >= 0),
  creado_en        timestamptz not null default now(),
  unique (usuario_id, semana)
);

-- ---------- 3. PLANES DE ALIMENTACIÓN ----------
-- 'contenido' guarda los 7 días (JSONB):
-- { dias: [{ dia:1, comidas:[{ nombre, tiempo_min, ingredientes:[{item,cantidad}],
--            pasos:[...], foto_url }] }] }
create table public.planes_alimentacion (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references public.usuarios(id) on delete cascade,
  semana        integer not null check (semana >= 1),
  comidas_por_dia smallint not null check (comidas_por_dia in (2,3)),
  calorias_dia  integer not null,
  contenido     jsonb not null,
  pdf_path      text,
  generado_en   timestamptz not null default now(),
  unique (usuario_id, semana)
);

-- ---------- 4. RUTINAS DE EJERCICIO ----------
create table public.rutinas_ejercicio (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references public.usuarios(id) on delete cascade,
  semana       integer not null check (semana >= 1),
  modalidad    text not null check (modalidad in ('casa','gimnasio')),
  fuerza       jsonb not null,   -- [{ejercicio, series, reps, descanso_seg}]
  cardio       jsonb not null,   -- {frecuencia_semanal, intensidad, duracion_min, ejemplos}
  creado_en    timestamptz not null default now(),
  unique (usuario_id, semana)
);

-- =====================================================================
-- FUNCIONES AUXILIARES (security definer: leen usuarios sin recursión de RLS)
-- =====================================================================
create or replace function public.mi_perfil_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.usuarios where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.mi_familia()
returns uuid language sql stable security definer set search_path = public as $$
  select familia_id from public.usuarios where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.familia_de(uid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select familia_id from public.usuarios where id = uid;
$$;

create or replace function public.soy_admin_de(fam uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.usuarios u
                 where u.familia_id = fam and u.auth_user_id = auth.uid() and u.rol = 'admin');
$$;

-- ¿Puedo ver/editar los datos de este perfil? (soy yo, o soy admin de su familia)
create or replace function public.puedo_ver(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.usuarios u
                 where u.id = uid
                   and (u.auth_user_id = auth.uid() or public.soy_admin_de(u.familia_id)));
$$;

-- Primer registro: crea la familia y deja a quien la crea como administrador.
create or replace function public.crear_familia(p_nombre text, p_alias text)
returns uuid language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  if exists (select 1 from public.usuarios where auth_user_id = auth.uid()) then
    raise exception 'Ya perteneces a una familia';
  end if;
  insert into public.familias(nombre) values (p_nombre) returning id into fid;
  insert into public.usuarios(familia_id, auth_user_id, rol, alias, email_invitacion)
  values (fid, auth.uid(), 'admin', p_alias, auth.jwt() ->> 'email');
  return fid;
end $$;

-- Una persona invitada se registra con su correo y reclama su perfil.
-- Requiere "Confirm email" activo en Supabase Auth para que el correo sea verificado.
create or replace function public.reclamar_perfil()
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  perform set_config('nutriplot.reclamo', '1', true);
  update public.usuarios set auth_user_id = auth.uid()
   where auth_user_id is null
     and lower(email_invitacion) = lower(auth.jwt() ->> 'email')
  returning id into uid;
  return uid;
end $$;

-- Un miembro no puede cambiarse el rol, la familia ni el acceso.
create or replace function public.proteger_campos_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_setting('nutriplot.reclamo', true) = '1' then return new; end if;
  if auth.uid() is not null and not public.soy_admin_de(old.familia_id) then
    if new.rol <> old.rol
       or new.familia_id <> old.familia_id
       or new.auth_user_id is distinct from old.auth_user_id then
      raise exception 'Solo el administrador puede cambiar rol, familia o acceso';
    end if;
  end if;
  return new;
end $$;

create trigger trg_proteger_usuario before update on public.usuarios
  for each row execute function public.proteger_campos_usuario();

-- Día 0 congelado: una vez que la persona pulsa "A partir de hoy quiero
-- transformar mi cuerpo para siempre" (fecha_inicio con valor), su punto de
-- partida ya no se puede modificar, ni por ella ni por el administrador.
create or replace function public.congelar_dia0()
returns trigger language plpgsql as $$
begin
  if old.fecha_inicio is not null and (
       (new.fecha_inicio, new.sexo, new.fecha_nacimiento, new.altura_cm, new.peso_inicial_kg,
        new.pecho_cm, new.cintura_cm, new.cadera_cm, new.muslo_izq_cm, new.muslo_der_cm,
        new.biceps_izq_cm, new.biceps_der_cm, new.muneca_cm, new.complexion)
       is distinct from
       (old.fecha_inicio, old.sexo, old.fecha_nacimiento, old.altura_cm, old.peso_inicial_kg,
        old.pecho_cm, old.cintura_cm, old.cadera_cm, old.muslo_izq_cm, old.muslo_der_cm,
        old.biceps_izq_cm, old.biceps_der_cm, old.muneca_cm, old.complexion)
     ) then
    raise exception 'El Día 0 ya está registrado y no se puede modificar';
  end if;
  return new;
end $$;

create trigger trg_congelar_dia0 before update on public.usuarios
  for each row execute function public.congelar_dia0();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.familias            enable row level security;
alter table public.usuarios            enable row level security;
alter table public.checkins_semanales  enable row level security;
alter table public.planes_alimentacion enable row level security;
alter table public.rutinas_ejercicio   enable row level security;

create policy "familias_select" on public.familias
  for select using (id = public.mi_familia());
create policy "familias_update_admin" on public.familias
  for update using (public.soy_admin_de(id)) with check (public.soy_admin_de(id));

-- USUARIOS: cada quien ve su fila; el admin ve todas las de su familia.
create policy "usuarios_select" on public.usuarios
  for select using (auth_user_id = auth.uid() or public.soy_admin_de(familia_id));
create policy "usuarios_insert_admin" on public.usuarios
  for insert with check (public.soy_admin_de(familia_id) and rol = 'miembro');
create policy "usuarios_update" on public.usuarios
  for update using (auth_user_id = auth.uid() or public.soy_admin_de(familia_id))
  with check (auth_user_id = auth.uid() or public.soy_admin_de(familia_id));
create policy "usuarios_delete_admin" on public.usuarios
  for delete using (public.soy_admin_de(familia_id) and rol = 'miembro');

-- CHECK-INS y RUTINAS: el dueño y el admin.
create policy "checkins_crud" on public.checkins_semanales
  for all using (public.puedo_ver(usuario_id)) with check (public.puedo_ver(usuario_id));
create policy "rutinas_crud" on public.rutinas_ejercicio
  for all using (public.puedo_ver(usuario_id)) with check (public.puedo_ver(usuario_id));

-- PAYWALL A NIVEL DE BASE DE DATOS:
-- Cada persona lee el plan de la semana N solo si ya existe SU check-in N.
-- El admin lo ve siempre para los demás, pero el suyo también está bloqueado.
create policy "planes_select" on public.planes_alimentacion
  for select using (
    public.puedo_ver(usuario_id)
    and (
      (public.soy_admin_de(public.familia_de(usuario_id)) and usuario_id <> public.mi_perfil_id())
      or exists (
        select 1 from public.checkins_semanales c
        where c.usuario_id = planes_alimentacion.usuario_id
          and c.semana     = planes_alimentacion.semana
      )
    )
  );
-- Las inserciones de planes las hace el servidor con service_role (bypassa RLS).

-- =====================================================================
-- STORAGE
-- Ruta: {familia_id}/{usuario_id}/semana-{n}/{frente|costado}.jpg
-- Acceso: la propia persona y el admin de su familia.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-progreso', 'fotos-progreso', false, 8388608,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "fotos_select" on storage.objects for select
  using (bucket_id = 'fotos-progreso' and public.puedo_ver(((storage.foldername(name))[2])::uuid));
create policy "fotos_insert" on storage.objects for insert
  with check (bucket_id = 'fotos-progreso' and public.puedo_ver(((storage.foldername(name))[2])::uuid));
create policy "fotos_update" on storage.objects for update
  using (bucket_id = 'fotos-progreso' and public.puedo_ver(((storage.foldername(name))[2])::uuid));
create policy "fotos_delete" on storage.objects for delete
  using (bucket_id = 'fotos-progreso' and public.puedo_ver(((storage.foldername(name))[2])::uuid));
