insert into storage.buckets (id, name, public)
values ('orthoscan', 'orthoscan', false)
on conflict do nothing;

create policy "orthoscan_read"
on storage.objects for select
using (
  bucket_id = 'orthoscan'
  and auth.uid() is not null
  and (storage.foldername(name))[2] = app_current_clinic_id()::text
);

create policy "orthoscan_insert"
on storage.objects for insert
with check (
  bucket_id = 'orthoscan'
  and auth.uid() is not null
  and (storage.foldername(name))[2] = app_current_clinic_id()::text
);

create policy "orthoscan_update"
on storage.objects for update
using (
  bucket_id = 'orthoscan'
  and auth.uid() is not null
  and (storage.foldername(name))[2] = app_current_clinic_id()::text
);

create policy "orthoscan_delete"
on storage.objects for delete
using (
  bucket_id = 'orthoscan'
  and auth.uid() is not null
  and (storage.foldername(name))[2] = app_current_clinic_id()::text
);
