-- ============================================================
-- 0002 — completion notes
-- Run this in the Supabase SQL editor (safe to run once; idempotent).
-- ============================================================

alter table tasks add column if not exists completion_note text;
