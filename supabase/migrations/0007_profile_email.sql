-- ============================================================
-- 0007 — store email on profiles (needed to send digests)
-- Run once.
-- ============================================================

alter table profiles add column if not exists email text;

-- Backfill existing members from auth.users
update profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- Capture email for future signups
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    'maintenance',
    new.email
  );
  return new;
end; $$;
