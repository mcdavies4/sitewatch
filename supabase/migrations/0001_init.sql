-- ============================================================
-- Sitewatch — initial schema (M0 + forward-compatible to M2)
-- Paste into the Supabase SQL editor and run once.
-- ============================================================

-- ---------- enums ----------
create type user_role     as enum ('maintenance','manager','care_staff','admin','contractor');
create type task_frequency as enum ('daily','weekly','monthly','quarterly','yearly');
create type task_source   as enum ('recurring_statutory','staff_reported','manager_assigned','self_created','contractor_callout');
create type task_status   as enum ('open','in_progress','completed','cancelled');
create type task_priority as enum ('low','medium','high');

-- ---------- tables ----------
create table sites (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  address    text,
  created_at timestamptz not null default now()
);

create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role       user_role not null default 'maintenance',
  site_id    uuid references sites(id),
  created_at timestamptz not null default now()
);

create table assets (
  id            uuid primary key default gen_random_uuid(),
  site_id       uuid not null references sites(id) on delete cascade,
  name          text not null,
  type          text,
  location_text text,
  created_at    timestamptz not null default now()
);

create table task_templates (
  id             uuid primary key default gen_random_uuid(),
  site_id        uuid not null references sites(id) on delete cascade,
  title          text not null,
  description    text,
  category       text,
  requires_photo boolean not null default true,
  frequency      task_frequency not null,
  interval_n     int not null default 1,
  next_due_date  date not null,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

create table tasks (
  id               uuid primary key default gen_random_uuid(),
  site_id          uuid not null references sites(id) on delete cascade,
  template_id      uuid references task_templates(id) on delete set null,
  asset_id         uuid references assets(id) on delete set null,
  title            text not null,
  description      text,
  category         text,
  source           task_source not null,
  priority         task_priority not null default 'medium',
  status           task_status not null default 'open',
  due_date         date,
  assigned_to      uuid references profiles(id),
  created_by       uuid references profiles(id),
  reported_by_name text,
  requires_photo   boolean not null default false,
  completed_at     timestamptz,
  completed_by     uuid references profiles(id),
  created_at       timestamptz not null default now()
);
create index tasks_site_status_idx on tasks (site_id, status);
create index tasks_due_idx on tasks (due_date);

create table task_proofs (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references tasks(id) on delete cascade,
  storage_path text not null,
  captured_at  timestamptz not null default now(),
  uploaded_by  uuid not null references profiles(id),
  note         text,
  image_sha256 text,
  created_at   timestamptz not null default now()
);

-- ---------- auto-create a profile on signup ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    'maintenance'
  );
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- row level security ----------
alter table sites          enable row level security;
alter table profiles       enable row level security;
alter table assets         enable row level security;
alter table task_templates enable row level security;
alter table tasks          enable row level security;
alter table task_proofs    enable row level security;

-- helper: the caller's site
create or replace function public.my_site_id() returns uuid
language sql stable security definer set search_path = public as $$
  select site_id from public.profiles where id = auth.uid();
$$;

-- profiles: read/update your own row
create policy "own profile read"   on profiles for select using (id = auth.uid());
create policy "own profile update" on profiles for update using (id = auth.uid());

-- sites: any signed-in user can create one; read sites you belong to
create policy "sites insert" on sites for insert with check (auth.uid() is not null);
create policy "sites read"   on sites for select using (auth.uid() is not null);
create policy "sites update" on sites for update using (id = public.my_site_id());

-- everything else is scoped to your site
create policy "assets all" on assets for all
  using (site_id = public.my_site_id()) with check (site_id = public.my_site_id());

create policy "templates all" on task_templates for all
  using (site_id = public.my_site_id()) with check (site_id = public.my_site_id());

create policy "tasks all" on tasks for all
  using (site_id = public.my_site_id()) with check (site_id = public.my_site_id());

create policy "proofs all" on task_proofs for all
  using (task_id in (select id from tasks where site_id = public.my_site_id()))
  with check (task_id in (select id from tasks where site_id = public.my_site_id()));

-- ============================================================
-- FORWARD (M1/M2) — defined now, wired up in later milestones
-- ============================================================

-- M1: completion that REQUIRES a photo proof for flagged tasks
create or replace function public.complete_task(p_task_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare needs_photo boolean; proof_count int;
begin
  select requires_photo into needs_photo from tasks where id = p_task_id;
  select count(*) into proof_count from task_proofs where task_id = p_task_id;
  if needs_photo and proof_count = 0 then
    raise exception 'Photo proof required before completing this task';
  end if;
  update tasks
     set status = 'completed', completed_at = now(), completed_by = auth.uid()
   where id = p_task_id;
end; $$;

-- M2: daily generator that materialises recurring tasks from templates
create or replace function public.generate_due_tasks()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into tasks (site_id, template_id, title, description, category,
                     source, status, due_date, requires_photo)
  select t.site_id, t.id, t.title, t.description, t.category,
         'recurring_statutory', 'open', t.next_due_date, t.requires_photo
  from task_templates t
  where t.active
    and t.next_due_date <= current_date
    and not exists (
      select 1 from tasks x
      where x.template_id = t.id
        and x.due_date = t.next_due_date
        and x.status <> 'cancelled'
    );

  update task_templates t set next_due_date =
    case t.frequency
      when 'daily'     then t.next_due_date + t.interval_n
      when 'weekly'    then t.next_due_date + (t.interval_n * 7)
      when 'monthly'   then (t.next_due_date + (t.interval_n || ' month')::interval)::date
      when 'quarterly' then (t.next_due_date + (t.interval_n * 3 || ' month')::interval)::date
      when 'yearly'    then (t.next_due_date + (t.interval_n || ' year')::interval)::date
    end
  where t.active and t.next_due_date <= current_date;
end; $$;

-- To schedule the generator daily (M2), enable pg_cron in the dashboard, then:
-- select cron.schedule('generate-due-tasks', '0 6 * * *', 'select public.generate_due_tasks()');

-- ============================================================
-- M1 STORAGE — photo proof bucket + policies
-- ============================================================
insert into storage.buckets (id, name, public)
values ('task-proofs', 'task-proofs', false)
on conflict (id) do nothing;

-- Signed-in users can upload proofs and read them back.
-- (Single-operator scope for now; tighten to per-site folders later.)
create policy "proofs upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'task-proofs');

create policy "proofs read" on storage.objects
  for select to authenticated
  using (bucket_id = 'task-proofs');

-- ============================================================
-- Function grants (cron endpoint calls generate_due_tasks via the anon key)
-- ============================================================
grant execute on function public.generate_due_tasks() to anon, authenticated;
grant execute on function public.complete_task(uuid) to authenticated;
