-- ============================================================
-- 0006 — contractor call-outs
-- A call-out is a task (source = 'contractor_callout') with the
-- contractor's details and an expected/chase date (due_date). Run once.
-- ============================================================

alter table tasks add column if not exists contractor_name text;
alter table tasks add column if not exists contractor_contact text;
