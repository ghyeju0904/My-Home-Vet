create or replace function public.mhv_device_id()
returns text
language sql
stable
as $$
  select coalesce((current_setting('request.headers', true)::jsonb ->> 'x-device-id'), '');
$$;

alter table public.pets add column if not exists device_id text;
alter table public.behavior_analyses add column if not exists device_id text;
alter table public.diet_plans add column if not exists device_id text;
alter table public.health_records add column if not exists device_id text;
alter table public.notifications add column if not exists device_id text;

alter table public.pets alter column user_id drop not null;
alter table public.notifications alter column user_id drop not null;

update public.pets set device_id = coalesce(device_id, 'legacy') where device_id is null;
update public.behavior_analyses set device_id = coalesce(device_id, 'legacy') where device_id is null;
update public.diet_plans set device_id = coalesce(device_id, 'legacy') where device_id is null;
update public.health_records set device_id = coalesce(device_id, 'legacy') where device_id is null;
update public.notifications set device_id = coalesce(device_id, 'legacy') where device_id is null;

alter table public.pets alter column device_id set not null;
alter table public.behavior_analyses alter column device_id set not null;
alter table public.diet_plans alter column device_id set not null;
alter table public.health_records alter column device_id set not null;
alter table public.notifications alter column device_id set not null;

create index if not exists pets_device_id_idx on public.pets(device_id);
create index if not exists behavior_analyses_device_id_idx on public.behavior_analyses(device_id);
create index if not exists diet_plans_device_id_idx on public.diet_plans(device_id);
create index if not exists health_records_device_id_idx on public.health_records(device_id);
create index if not exists notifications_device_id_idx on public.notifications(device_id);

grant select, insert, update, delete on public.pets to anon, authenticated;
grant select, insert, update, delete on public.behavior_analyses to anon, authenticated;
grant select, insert, update, delete on public.diet_plans to anon, authenticated;
grant select, insert, update, delete on public.health_records to anon, authenticated;
grant select, insert, update, delete on public.notifications to anon, authenticated;

drop policy if exists pets_select_own on public.pets;
drop policy if exists pets_insert_own on public.pets;
drop policy if exists pets_update_own on public.pets;
drop policy if exists pets_delete_own on public.pets;

create policy pets_select_device on public.pets
  for select
  using (device_id <> '' and device_id = public.mhv_device_id());

create policy pets_insert_device on public.pets
  for insert
  with check (device_id <> '' and device_id = public.mhv_device_id());

create policy pets_update_device on public.pets
  for update
  using (device_id <> '' and device_id = public.mhv_device_id())
  with check (device_id <> '' and device_id = public.mhv_device_id());

create policy pets_delete_device on public.pets
  for delete
  using (device_id <> '' and device_id = public.mhv_device_id());

drop policy if exists behavior_analyses_select_own on public.behavior_analyses;
drop policy if exists behavior_analyses_insert_own on public.behavior_analyses;
drop policy if exists behavior_analyses_update_own on public.behavior_analyses;
drop policy if exists behavior_analyses_delete_own on public.behavior_analyses;

create policy behavior_analyses_select_device on public.behavior_analyses
  for select
  using (device_id <> '' and device_id = public.mhv_device_id());

create policy behavior_analyses_insert_device on public.behavior_analyses
  for insert
  with check (device_id <> '' and device_id = public.mhv_device_id());

create policy behavior_analyses_update_device on public.behavior_analyses
  for update
  using (device_id <> '' and device_id = public.mhv_device_id())
  with check (device_id <> '' and device_id = public.mhv_device_id());

create policy behavior_analyses_delete_device on public.behavior_analyses
  for delete
  using (device_id <> '' and device_id = public.mhv_device_id());

drop policy if exists diet_plans_select_own on public.diet_plans;
drop policy if exists diet_plans_insert_own on public.diet_plans;
drop policy if exists diet_plans_update_own on public.diet_plans;
drop policy if exists diet_plans_delete_own on public.diet_plans;

create policy diet_plans_select_device on public.diet_plans
  for select
  using (device_id <> '' and device_id = public.mhv_device_id());

create policy diet_plans_insert_device on public.diet_plans
  for insert
  with check (device_id <> '' and device_id = public.mhv_device_id());

create policy diet_plans_update_device on public.diet_plans
  for update
  using (device_id <> '' and device_id = public.mhv_device_id())
  with check (device_id <> '' and device_id = public.mhv_device_id());

create policy diet_plans_delete_device on public.diet_plans
  for delete
  using (device_id <> '' and device_id = public.mhv_device_id());

drop policy if exists health_records_select_own on public.health_records;
drop policy if exists health_records_insert_own on public.health_records;
drop policy if exists health_records_update_own on public.health_records;
drop policy if exists health_records_delete_own on public.health_records;

create policy health_records_select_device on public.health_records
  for select
  using (device_id <> '' and device_id = public.mhv_device_id());

create policy health_records_insert_device on public.health_records
  for insert
  with check (device_id <> '' and device_id = public.mhv_device_id());

create policy health_records_update_device on public.health_records
  for update
  using (device_id <> '' and device_id = public.mhv_device_id())
  with check (device_id <> '' and device_id = public.mhv_device_id());

create policy health_records_delete_device on public.health_records
  for delete
  using (device_id <> '' and device_id = public.mhv_device_id());

drop policy if exists notifications_select_own on public.notifications;
drop policy if exists notifications_insert_own on public.notifications;
drop policy if exists notifications_update_own on public.notifications;
drop policy if exists notifications_delete_own on public.notifications;

create policy notifications_select_device on public.notifications
  for select
  using (device_id <> '' and device_id = public.mhv_device_id());

create policy notifications_insert_device on public.notifications
  for insert
  with check (device_id <> '' and device_id = public.mhv_device_id());

create policy notifications_update_device on public.notifications
  for update
  using (device_id <> '' and device_id = public.mhv_device_id())
  with check (device_id <> '' and device_id = public.mhv_device_id());

create policy notifications_delete_device on public.notifications
  for delete
  using (device_id <> '' and device_id = public.mhv_device_id());

