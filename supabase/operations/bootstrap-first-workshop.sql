-- ONE-TIME OPERATOR TASK — run manually in the Supabase SQL Editor.
-- Replace all three values before execution. Do not expose service-role credentials.
-- This file is intentionally outside supabase/migrations and is never run by CI.

do $$
declare
  target_user_id uuid := '00000000-0000-0000-0000-000000000000'; -- replace with the existing Auth user's UUID
  workshop_name text := 'REPLACE WITH WORKSHOP NAME';
  workshop_slug text := 'replace-with-workshop-slug';
  created_workshop_id uuid;
begin
  if target_user_id = '00000000-0000-0000-0000-000000000000'
     or workshop_name = 'REPLACE WITH WORKSHOP NAME'
     or workshop_slug = 'replace-with-workshop-slug' then
    raise exception 'Replace the operator placeholders before running this script';
  end if;

  if not exists (select 1 from auth.users u where u.id = target_user_id) then
    raise exception 'The target user does not exist in Supabase Auth';
  end if;

  if exists (
    select 1
    from public.workshop_memberships m
    where m.user_id = target_user_id and m.status = 'active'
  ) then
    raise exception 'The target user already has an active workshop membership; stop and review manually';
  end if;

  if exists (select 1 from public.workshops w where w.slug = workshop_slug) then
    raise exception 'The workshop slug is already in use; choose a unique slug';
  end if;

  insert into public.workshops (name, slug, status)
  values (trim(workshop_name), lower(trim(workshop_slug)), 'active')
  returning id into created_workshop_id;

  insert into public.workshop_memberships (workshop_id, user_id, role, status)
  values (created_workshop_id, target_user_id, 'owner', 'active');

  raise notice 'Created workshop % and assigned owner membership to Auth user %',
    created_workshop_id, target_user_id;
end
$$;

-- After successful execution, verify only the intended IDs and role:
-- select w.id as workshop_id, w.name, w.slug, m.user_id, m.role, m.status
-- from public.workshops w
-- join public.workshop_memberships m on m.workshop_id = w.id
-- where w.slug = 'replace-with-workshop-slug';
