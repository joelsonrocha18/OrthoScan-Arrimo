create extension if not exists "pgcrypto";

do $$ begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum (
      'master_admin',
      'dentist_admin',
      'dentist_client',
      'clinic_client',
      'lab_tech',
      'receptionist'
    );
  end if;
end $$;

create table if not exists clinics (
  id uuid primary key default gen_random_uuid(),
  trade_name text not null,
  legal_name text,
  cnpj text,
  phone text,
  whatsapp text,
  email text,
  address jsonb,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists dentists (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id),
  name text not null,
  gender text check (gender in ('masculino','feminino')) default 'masculino',
  cro text,
  phone text,
  whatsapp text,
  email text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null default 'dentist_client',
  clinic_id uuid references clinics(id),
  dentist_id uuid references dentists(id),
  full_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id),
  primary_dentist_id uuid references dentists(id),
  name text not null,
  cpf text,
  birth_date date,
  gender text,
  phone text,
  whatsapp text,
  email text,
  address jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists scans (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id),
  patient_id uuid references patients(id),
  dentist_id uuid references dentists(id),
  requested_by_dentist_id uuid references dentists(id),
  arch text,
  complaint text,
  dentist_guidance text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  data jsonb not null default '{}'::jsonb
);

create table if not exists cases (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id),
  patient_id uuid references patients(id),
  dentist_id uuid references dentists(id),
  requested_by_dentist_id uuid references dentists(id),
  scan_id uuid references scans(id),
  status text not null default 'draft',
  change_every_days int,
  total_trays_upper int,
  total_trays_lower int,
  attachments_tray boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  data jsonb not null default '{}'::jsonb
);

create table if not exists lab_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id),
  case_id uuid references cases(id),
  tray_number int,
  status text not null default 'aguardando_iniciar',
  priority text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  data jsonb not null default '{}'::jsonb
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id),
  patient_id uuid references patients(id),
  case_id uuid references cases(id),
  scan_id uuid references scans(id),
  category text not null default 'outro',
  title text not null,
  file_path text,
  file_name text,
  mime_type text,
  status text not null default 'ok',
  note text,
  error_note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_clinics_updated_at') then
    create trigger trg_clinics_updated_at before update on clinics for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_dentists_updated_at') then
    create trigger trg_dentists_updated_at before update on dentists for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_profiles_updated_at') then
    create trigger trg_profiles_updated_at before update on profiles for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_patients_updated_at') then
    create trigger trg_patients_updated_at before update on patients for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_scans_updated_at') then
    create trigger trg_scans_updated_at before update on scans for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_cases_updated_at') then
    create trigger trg_cases_updated_at before update on cases for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_lab_items_updated_at') then
    create trigger trg_lab_items_updated_at before update on lab_items for each row execute function set_updated_at();
  end if;
end $$;

alter table clinics enable row level security;
alter table dentists enable row level security;
alter table profiles enable row level security;
alter table patients enable row level security;
alter table scans enable row level security;
alter table cases enable row level security;
alter table lab_items enable row level security;
alter table documents enable row level security;

create or replace function app_current_role()
returns app_role
language sql
stable
security definer
as $$
  select coalesce((select role from profiles where user_id = auth.uid()), 'dentist_client'::app_role);
$$;

create or replace function app_current_clinic_id()
returns uuid
language sql
stable
security definer
as $$
  select (select clinic_id from profiles where user_id = auth.uid());
$$;

create or replace function app_is_admin()
returns boolean
language sql
stable
security definer
as $$
  select app_current_role() in ('master_admin','dentist_admin');
$$;

create or replace function app_is_master()
returns boolean
language sql
stable
security definer
as $$
  select app_current_role() = 'master_admin';
$$;

create policy "profiles_select_own_or_admin"
on profiles for select
using (
  user_id = auth.uid()
  or app_is_master()
  or (app_is_admin() and clinic_id = app_current_clinic_id())
);

create policy "profiles_update_admin"
on profiles for update
using (
  app_is_master()
  or (app_is_admin() and clinic_id = app_current_clinic_id())
);

create policy "clinics_select_scope"
on clinics for select
using (
  app_is_master()
  or app_is_admin()
  or id = app_current_clinic_id()
);

create policy "clinics_write_admin"
on clinics for insert with check (app_is_master() or app_is_admin());
create policy "clinics_update_admin"
on clinics for update using (app_is_master() or app_is_admin());

create policy "dentists_select_scope"
on dentists for select
using (
  app_is_master()
  or clinic_id = app_current_clinic_id()
);

create policy "dentists_write_admin"
on dentists for insert with check (app_is_master() or app_is_admin());
create policy "dentists_update_admin"
on dentists for update using (app_is_master() or app_is_admin());

create policy "patients_select_scope"
on patients for select
using (
  app_is_master()
  or clinic_id = app_current_clinic_id()
  or (
    app_current_role() = 'dentist_client'
    and primary_dentist_id = (select dentist_id from profiles where user_id = auth.uid())
  )
);

create policy "patients_write_admin"
on patients for insert with check (
  app_is_master()
  or app_current_role() in ('dentist_admin','receptionist')
);
create policy "patients_update_admin"
on patients for update using (
  app_is_master()
  or app_current_role() in ('dentist_admin','receptionist')
);

create policy "scans_select_scope"
on scans for select
using (
  app_is_master()
  or clinic_id = app_current_clinic_id()
  or (
    app_current_role() = 'dentist_client'
    and dentist_id = (select dentist_id from profiles where user_id = auth.uid())
  )
);

create policy "scans_write_admin"
on scans for insert with check (
  app_is_master()
  or app_current_role() in ('dentist_admin','receptionist')
);
create policy "scans_update_admin"
on scans for update using (
  app_is_master()
  or app_current_role() in ('dentist_admin','receptionist')
);

create policy "cases_select_scope"
on cases for select
using (
  app_is_master()
  or clinic_id = app_current_clinic_id()
  or (
    app_current_role() = 'dentist_client'
    and dentist_id = (select dentist_id from profiles where user_id = auth.uid())
  )
);

create policy "cases_write_admin"
on cases for insert with check (
  app_is_master()
  or app_current_role() = 'dentist_admin'
);
create policy "cases_update_admin"
on cases for update using (
  app_is_master()
  or app_current_role() = 'dentist_admin'
);

create policy "lab_select_scope"
on lab_items for select
using (
  app_is_master()
  or clinic_id = app_current_clinic_id()
);
create policy "lab_write_admin"
on lab_items for insert with check (
  app_is_master()
  or app_current_role() = 'dentist_admin'
);
create policy "lab_update_admin"
on lab_items for update using (
  app_is_master()
  or app_current_role() = 'dentist_admin'
);

create policy "documents_select_scope"
on documents for select
using (
  app_is_master()
  or clinic_id = app_current_clinic_id()
  or (
    app_current_role() = 'dentist_client'
    and (created_by = auth.uid())
  )
);
create policy "documents_write_scope"
on documents for insert with check (
  app_is_master()
  or app_current_role() in ('dentist_admin','receptionist','dentist_client','clinic_client')
);
create policy "documents_update_scope"
on documents for update using (
  app_is_master()
  or app_current_role() in ('dentist_admin','receptionist')
);
