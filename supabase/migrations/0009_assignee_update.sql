-- ============================================================
-- 0009 — let an assignee update their own task
-- A contractor can update the status of a call-out assigned to them
-- (e.g. mark it attended / done). Operating roles keep full update.
-- Run once.
-- ============================================================

drop policy if exists "tasks update" on tasks;

create policy "tasks update" on tasks for update using (
  site_id = public.my_site_id()
  and (
    public.my_role() in ('admin', 'manager', 'maintenance')
    or assigned_to = auth.uid()
  )
) with check (site_id = public.my_site_id());
