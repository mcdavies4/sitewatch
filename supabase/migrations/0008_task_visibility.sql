-- ============================================================
-- 0008 — role-aware task visibility
-- Operating roles (admin/manager/maintenance) see all of their site's
-- tasks. Limited roles (care_staff/contractor) see only tasks they
-- reported or are assigned. Enforced in the database, not just the UI.
-- Run once.
-- ============================================================

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role::text from public.profiles where id = auth.uid();
$$;

-- Replace the single permissive policy with role-aware ones
drop policy if exists "tasks all" on tasks;

create policy "tasks select" on tasks for select using (
  site_id = public.my_site_id()
  and (
    public.my_role() in ('admin', 'manager', 'maintenance')
    or created_by = auth.uid()
    or assigned_to = auth.uid()
  )
);

-- Any member can create a task (e.g. care staff reporting an issue)
create policy "tasks insert" on tasks for insert
  with check (site_id = public.my_site_id());

-- Only operating roles can change or remove tasks
create policy "tasks update" on tasks for update using (
  site_id = public.my_site_id()
  and public.my_role() in ('admin', 'manager', 'maintenance')
);

create policy "tasks delete" on tasks for delete using (
  site_id = public.my_site_id()
  and public.my_role() in ('admin', 'manager', 'maintenance')
);

-- Proof photos follow task visibility: you can only read proofs for tasks
-- you're allowed to see.
drop policy if exists "proofs all" on task_proofs;

create policy "proofs select" on task_proofs for select using (
  task_id in (
    select id from tasks where site_id = public.my_site_id()
    and (
      public.my_role() in ('admin', 'manager', 'maintenance')
      or created_by = auth.uid()
      or assigned_to = auth.uid()
    )
  )
);

create policy "proofs write" on task_proofs for all using (
  task_id in (select id from tasks where site_id = public.my_site_id())
) with check (
  task_id in (select id from tasks where site_id = public.my_site_id())
);
