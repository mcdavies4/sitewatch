-- ============================================================
-- 0004 — team: invites, roles, and secure site joining
-- Run once in the Supabase SQL editor.
-- ============================================================

-- ---------- invites ----------
create table if not exists invites (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references sites(id) on delete cascade,
  email       text not null,
  role        user_role not null default 'care_staff',
  invited_by  uuid references profiles(id),
  status      text not null default 'pending',
  created_at  timestamptz not null default now(),
  accepted_at timestamptz
);
create index if not exists invites_email_idx on invites (lower(email));

alter table invites enable row level security;

-- members of a site see its invites; an invited person sees invites to their email
create policy "invites read" on invites for select using (
  site_id = public.my_site_id()
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);
create policy "invites insert" on invites for insert
  with check (site_id = public.my_site_id());
create policy "invites update" on invites for update using (
  site_id = public.my_site_id()
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);
create policy "invites delete" on invites for delete
  using (site_id = public.my_site_id());

-- ---------- lock down who can change site_id / role ----------
-- Members may edit only their own name. Site membership and role are set
-- exclusively through the SECURITY DEFINER functions below, which validate
-- ownership or a matching invite first.
revoke update on table profiles from authenticated;
grant update (full_name) on table profiles to authenticated;

-- ---------- create a site and become its admin ----------
create or replace function public.create_site(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_site uuid;
begin
  if (select site_id from profiles where id = auth.uid()) is not null then
    raise exception 'You are already part of a site';
  end if;
  insert into sites (name) values (p_name) returning id into new_site;
  update profiles set site_id = new_site, role = 'admin' where id = auth.uid();
  return new_site;
end; $$;

-- ---------- accept an invite (email must match) ----------
create or replace function public.accept_invite(p_invite_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare inv invites;
begin
  select * into inv from invites where id = p_invite_id;
  if inv.id is null then raise exception 'Invite not found'; end if;
  if inv.status <> 'pending' then raise exception 'Invite already used'; end if;
  if lower(inv.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'This invite is for a different email';
  end if;
  update profiles set site_id = inv.site_id, role = inv.role where id = auth.uid();
  update invites set status = 'accepted', accepted_at = now() where id = inv.id;
end; $$;

-- ---------- promote existing solo owners to admin ----------
-- Anyone who set up a site before roles existed and is its only member
-- becomes that site's admin, so they keep full access.
update profiles p set role = 'admin'
where role = 'maintenance'
  and site_id is not null
  and (select count(*) from profiles p2 where p2.site_id = p.site_id) = 1;
