-- Personalización de recetas por persona (ejecutar después de schema.sql)
create type movilidad_nivel as enum ('normal','reducida','muy_reducida');
create type textura_comida as enum ('normal','suave','molida');

alter table usuarios
  add column if not exists evita_mariscos boolean not null default false,   -- preferencia, no alergia
  add column if not exists movilidad movilidad_nivel not null default 'normal',
  add column if not exists textura textura_comida not null default 'normal',
  add column if not exists entrena_fuerza boolean not null default false,
  add column if not exists sodio_bajo boolean not null default false;       -- solo si lo indica su médico

-- Meta de proteína por comida (g): la app la calcula por edad/actividad; adultos mayores >= 25 g
alter table planes_alimentacion add column if not exists perfil_aplicado jsonb;
