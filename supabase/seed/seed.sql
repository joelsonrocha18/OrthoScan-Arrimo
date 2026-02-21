-- Seed basico
insert into public.clinics (trade_name, legal_name, cnpj, is_active)
select 'ARRIMO OrthoScan', 'ARRIMO', null, true
where not exists (
  select 1 from public.clinics where trade_name = 'ARRIMO OrthoScan'
);

-- Passo manual (apos criar usuario no Auth):
-- 1) Pegue o USER_ID no painel Auth.
-- 2) Pegue o CLINIC_ID da clinica criada acima.
-- 3) Execute:
-- insert into public.profiles(user_id, role, clinic_id, full_name, is_active)
-- values ('<USER_ID>', 'master_admin', '<CLINIC_ID>', 'Master Admin', true)
-- on conflict (user_id) do update
-- set role='master_admin', clinic_id=excluded.clinic_id, is_active=true;
