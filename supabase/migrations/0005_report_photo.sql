-- ============================================================
-- 0005 — report photo
-- Lets a staff-reported issue carry a photo of the problem
-- (separate from the completion proof). Run once.
-- ============================================================

alter table tasks add column if not exists report_photo_path text;
