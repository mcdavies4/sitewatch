-- ============================================================
-- 0003 — manager sign-off / verification
-- Run once in the Supabase SQL editor (idempotent).
-- ============================================================

alter table tasks add column if not exists verified_at timestamptz;
alter table tasks add column if not exists verified_by uuid references profiles(id);
