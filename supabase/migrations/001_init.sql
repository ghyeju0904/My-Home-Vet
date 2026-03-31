create extension if not exists pgcrypto;

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  species text not null check (species in ('dog', 'cat', 'other')),
  breed text,
  age_years integer check (age_years is null or age_years >= 0),
  weight_kg numeric(6, 2) check (weight_kg is null or weight_kg > 0),
  gender text check (gender is null or gender in ('male', 'female', 'unknown')),
  is_neutered boolean not null default false,
  last_checkup_date date,
  routine jsonb not null default '{}'::jsonb,
  allergies text[] not null default '{}',
  health_conditions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pets_user_id_idx on public.pets(user_id);

create table if not exists public.behavior_analyses (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  symptoms jsonb not null default '[]'::jsonb,
  description text,
  duration_days integer,
  urgency_level text not null check (urgency_level in ('low', 'medium', 'high')),
  likely_causes jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists behavior_analyses_pet_id_idx on public.behavior_analyses(pet_id);
create index if not exists behavior_analyses_created_at_idx on public.behavior_analyses(created_at desc);

create table if not exists public.diet_plans (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  plan jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists diet_plans_pet_id_idx on public.diet_plans(pet_id);
create index if not exists diet_plans_start_end_idx on public.diet_plans(start_date, end_date);

create table if not exists public.health_records (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  record_type text not null,
  data jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists health_records_pet_id_idx on public.health_records(pet_id);
create index if not exists health_records_created_at_idx on public.health_records(created_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  content text not null,
  data jsonb,
  scheduled_at timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_scheduled_at_idx on public.notifications(scheduled_at);
create index if not exists notifications_read_at_idx on public.notifications(read_at);

alter table public.pets enable row level security;
alter table public.behavior_analyses enable row level security;
alter table public.diet_plans enable row level security;
alter table public.health_records enable row level security;
alter table public.notifications enable row level security;

drop policy if exists pets_select_own on public.pets;
create policy pets_select_own on public.pets
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists pets_insert_own on public.pets;
create policy pets_insert_own on public.pets
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists pets_update_own on public.pets;
create policy pets_update_own on public.pets
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists pets_delete_own on public.pets;
create policy pets_delete_own on public.pets
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists behavior_analyses_select_own on public.behavior_analyses;
create policy behavior_analyses_select_own on public.behavior_analyses
  for select to authenticated
  using (exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid()));

drop policy if exists behavior_analyses_insert_own on public.behavior_analyses;
create policy behavior_analyses_insert_own on public.behavior_analyses
  for insert to authenticated
  with check (exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid()));

drop policy if exists behavior_analyses_update_own on public.behavior_analyses;
create policy behavior_analyses_update_own on public.behavior_analyses
  for update to authenticated
  using (exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid()));

drop policy if exists behavior_analyses_delete_own on public.behavior_analyses;
create policy behavior_analyses_delete_own on public.behavior_analyses
  for delete to authenticated
  using (exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid()));

drop policy if exists diet_plans_select_own on public.diet_plans;
create policy diet_plans_select_own on public.diet_plans
  for select to authenticated
  using (exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid()));

drop policy if exists diet_plans_insert_own on public.diet_plans;
create policy diet_plans_insert_own on public.diet_plans
  for insert to authenticated
  with check (exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid()));

drop policy if exists diet_plans_update_own on public.diet_plans;
create policy diet_plans_update_own on public.diet_plans
  for update to authenticated
  using (exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid()));

drop policy if exists diet_plans_delete_own on public.diet_plans;
create policy diet_plans_delete_own on public.diet_plans
  for delete to authenticated
  using (exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid()));

drop policy if exists health_records_select_own on public.health_records;
create policy health_records_select_own on public.health_records
  for select to authenticated
  using (exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid()));

drop policy if exists health_records_insert_own on public.health_records;
create policy health_records_insert_own on public.health_records
  for insert to authenticated
  with check (exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid()));

drop policy if exists health_records_update_own on public.health_records;
create policy health_records_update_own on public.health_records
  for update to authenticated
  using (exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid()));

drop policy if exists health_records_delete_own on public.health_records;
create policy health_records_delete_own on public.health_records
  for delete to authenticated
  using (exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid()));

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_insert_own on public.notifications;
create policy notifications_insert_own on public.notifications
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications
  for delete to authenticated
  using (user_id = auth.uid());
