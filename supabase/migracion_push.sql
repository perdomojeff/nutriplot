-- Recordatorios push (ejecutar después de schema.sql)
alter table public.usuarios
  add column if not exists zona_horaria text not null default 'America/New_York',
  add column if not exists recordatorio_activo boolean not null default true;

-- Un dispositivo = una suscripción. Una persona puede tener varias (teléfono, tablet).
create table if not exists public.push_suscripciones (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.usuarios(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  creado_en   timestamptz not null default now()
);

-- Evita avisar dos veces por el mismo check-in.
create table if not exists public.recordatorios_enviados (
  usuario_id  uuid not null references public.usuarios(id) on delete cascade,
  para_fecha  date not null,
  enviado_en  timestamptz not null default now(),
  primary key (usuario_id, para_fecha)
);

alter table public.push_suscripciones   enable row level security;
alter table public.recordatorios_enviados enable row level security;

-- Cada persona gestiona solo sus propios dispositivos. El envío usa service_role (sin RLS).
create policy "push_propias" on public.push_suscripciones
  for all using (exists (select 1 from public.usuarios u where u.id = usuario_id and u.auth_user_id = auth.uid()))
  with check (exists (select 1 from public.usuarios u where u.id = usuario_id and u.auth_user_id = auth.uid()));
