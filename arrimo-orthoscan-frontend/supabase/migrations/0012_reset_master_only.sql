begin;

do $$
begin
  -- Limpeza de dados operacionais (somente se a tabela existir).
  if to_regclass('public.internal_chat_reads') is not null then
    execute 'delete from public.internal_chat_reads';
  end if;
  if to_regclass('public.internal_chat_messages') is not null then
    execute 'delete from public.internal_chat_messages';
  end if;
  if to_regclass('public.password_reset_tokens') is not null then
    execute 'delete from public.password_reset_tokens';
  end if;
  if to_regclass('public.security_audit_logs') is not null then
    execute 'delete from public.security_audit_logs';
  end if;
  if to_regclass('public.user_onboarding_invites') is not null then
    execute 'delete from public.user_onboarding_invites';
  end if;
  if to_regclass('public.documents') is not null then
    execute 'delete from public.documents';
  end if;
  if to_regclass('public.deliveries') is not null then
    execute 'delete from public.deliveries';
  end if;
  if to_regclass('public.lab_items') is not null then
    execute 'delete from public.lab_items';
  end if;
  if to_regclass('public.cases') is not null then
    execute 'delete from public.cases';
  end if;
  if to_regclass('public.scans') is not null then
    execute 'delete from public.scans';
  end if;
  if to_regclass('public.patients') is not null then
    execute 'delete from public.patients';
  end if;

  -- Preserva apenas usuários master no app (profiles).
  if to_regclass('public.profiles') is not null then
    execute $sql$
      update public.profiles
      set clinic_id = null,
          dentist_id = null,
          is_active = true,
          deleted_at = null,
          updated_at = now()
      where role = 'master_admin'
    $sql$;

    execute $sql$
      delete from public.profiles
      where role <> 'master_admin'
    $sql$;
  end if;

  -- Tabelas auxiliares de vínculo/legado.
  if to_regclass('public.user_roles') is not null then
    execute 'delete from public.user_roles';
  end if;
  if to_regclass('public.dentists') is not null then
    execute 'delete from public.dentists';
  end if;
  if to_regclass('public.clinics') is not null then
    execute 'delete from public.clinics';
  end if;
end
$$;

commit;
