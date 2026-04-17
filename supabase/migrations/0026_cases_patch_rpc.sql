create or replace function public.patch_case_data(
  p_case_id uuid,
  p_patch jsonb default '{}'::jsonb,
  p_status text default null,
  p_phase text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case_id uuid;
  v_current_data jsonb;
  v_next_status text;
  v_next_phase text;
begin
  if not (public.app_is_master() or public.app_current_role() = 'dentist_admin') then
    raise exception 'Permissão negada para atualizar casos.'
      using errcode = '42501';
  end if;

  select c.id, coalesce(c.data, '{}'::jsonb)
    into v_case_id, v_current_data
  from public.cases c
  where c.id = p_case_id
    and c.deleted_at is null
  for update;

  if v_case_id is null then
    raise exception 'Caso não encontrado.'
      using errcode = 'P0002';
  end if;

  v_next_status := coalesce(
    nullif(btrim(p_status), ''),
    nullif(btrim(p_patch->>'status'), ''),
    nullif(btrim(v_current_data->>'status'), ''),
    'planejamento'
  );

  v_next_phase := coalesce(
    nullif(btrim(p_phase), ''),
    nullif(btrim(p_patch->>'phase'), ''),
    nullif(btrim(v_current_data->>'phase'), ''),
    'planejamento'
  );

  update public.cases c
  set
    data = v_current_data || coalesce(p_patch, '{}'::jsonb) || jsonb_build_object(
      'status', v_next_status,
      'phase', v_next_phase,
      'updatedAt', now()
    ),
    status = v_next_status,
    updated_at = now()
  where c.id = v_case_id;

  return v_case_id;
end;
$$;

revoke all on function public.patch_case_data(uuid, jsonb, text, text) from public;
grant execute on function public.patch_case_data(uuid, jsonb, text, text) to authenticated;
grant execute on function public.patch_case_data(uuid, jsonb, text, text) to service_role;
