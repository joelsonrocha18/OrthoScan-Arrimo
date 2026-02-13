create table if not exists permissions (
  id bigserial primary key,
  key text not null unique,
  label text not null,
  module text not null
);

create table if not exists profile_permissions (
  role app_role not null,
  permission_id bigint not null references permissions(id) on delete cascade,
  primary key (role, permission_id)
);

insert into permissions (key, label, module) values
  ('dashboard.read', 'Visualizar dashboard', 'Dashboard'),
  ('patients.read', 'Visualizar pacientes', 'Pacientes'),
  ('patients.write', 'Cadastrar/editar pacientes', 'Pacientes'),
  ('scans.read', 'Visualizar escaneamentos', 'Scans'),
  ('scans.write', 'Enviar escaneamentos', 'Scans'),
  ('scans.approve', 'Aprovar escaneamentos', 'Scans'),
  ('cases.read', 'Visualizar casos', 'Casos'),
  ('cases.write', 'Criar/editar casos', 'Casos'),
  ('lab.read', 'Visualizar laboratorio', 'Laboratorio'),
  ('lab.write', 'Gerenciar laboratorio', 'Laboratorio'),
  ('users.read', 'Visualizar usuarios', 'Usuarios'),
  ('users.write', 'Cadastrar/editar usuarios', 'Usuarios'),
  ('users.delete', 'Excluir usuarios', 'Usuarios'),
  ('settings.read', 'Visualizar configuracoes', 'Configuracoes'),
  ('settings.write', 'Gerenciar configuracoes', 'Configuracoes')
on conflict (key) do update
set label = excluded.label,
    module = excluded.module;

insert into profile_permissions (role, permission_id)
select 'master_admin'::app_role, p.id from permissions p
on conflict do nothing;

insert into profile_permissions (role, permission_id)
select 'dentist_admin'::app_role, p.id
from permissions p
where p.key in (
  'dashboard.read',
  'patients.read', 'patients.write',
  'scans.read', 'scans.write', 'scans.approve',
  'cases.read', 'cases.write',
  'lab.read', 'lab.write',
  'users.read', 'users.write', 'users.delete',
  'settings.read', 'settings.write'
)
on conflict do nothing;

insert into profile_permissions (role, permission_id)
select 'dentist_client'::app_role, p.id
from permissions p
where p.key in ('dashboard.read', 'patients.read', 'scans.read', 'cases.read')
on conflict do nothing;

insert into profile_permissions (role, permission_id)
select 'clinic_client'::app_role, p.id
from permissions p
where p.key in ('dashboard.read', 'patients.read', 'scans.read', 'cases.read')
on conflict do nothing;

insert into profile_permissions (role, permission_id)
select 'lab_tech'::app_role, p.id
from permissions p
where p.key in ('lab.read', 'cases.read', 'scans.read')
on conflict do nothing;

insert into profile_permissions (role, permission_id)
select 'receptionist'::app_role, p.id
from permissions p
where p.key in ('dashboard.read', 'patients.read', 'patients.write', 'scans.read', 'scans.write', 'cases.read', 'lab.read')
on conflict do nothing;
