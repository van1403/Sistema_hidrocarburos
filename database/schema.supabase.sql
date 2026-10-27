-- Esquema para Supabase (PostgreSQL).
-- Pégalo en: Supabase > SQL Editor > New query > Run

create table if not exists public.registros (
  id                bigint generated always as identity primary key,
  accion            text not null,
  accion_especifica text not null,
  sub_accion        text not null,
  tipo_agente       text not null,
  actividad         text not null,
  provincia         text not null,
  distrito          text not null,
  transporte        text not null,
  n_supervisores    integer not null check (n_supervisores > 0),
  empresa           text not null,
  calidad           text not null,
  expediente_siged  text not null,   -- texto: se conserva el formato original
  carta_linea       text not null,   -- texto: se conserva el formato original
  observaciones     text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.configuracion (
  clave text primary key,
  valor text not null
);

insert into public.configuracion (clave, valor) values ('mes', 'Noviembre'), ('oficina', 'Huánuco')
on conflict (clave) do nothing;

-- Seguridad: el backend usa la clave service_role (nunca va en el frontend).
-- Con RLS activado y sin políticas, nadie más puede leer o escribir las tablas con la clave anon.
alter table public.registros enable row level security;
alter table public.configuracion enable row level security;
