-- ONE-TIME OPERATOR TASK — run manually in the Supabase SQL Editor.
-- Replace the owner email, workshop name, and workshop slug before execution.
-- Rehearse in a disposable project first. Do not run against production until the
-- release gate explicitly authorizes first-workshop provisioning.
-- This file is intentionally outside supabase/migrations and is never run by CI.

do $$
declare
  owner_email text := 'REPLACE WITH OWNER EMAIL';
  target_user_id uuid;
  matching_user_count integer;
  workshop_name text := 'REPLACE WITH WORKSHOP NAME';
  workshop_slug text := 'replace-with-workshop-slug';
  created_workshop_id uuid;
begin
  if trim(owner_email) in ('', 'REPLACE WITH OWNER EMAIL')
     or trim(workshop_name) in ('', 'REPLACE WITH WORKSHOP NAME')
     or trim(workshop_slug) in ('', 'replace-with-workshop-slug') then
    raise exception 'Replace owner email, workshop name, and slug placeholders before execution';
  end if;

  workshop_slug := lower(trim(workshop_slug));
  if workshop_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Workshop slug must contain lowercase letters, digits, and single hyphens only';
  end if;

  select count(*) into matching_user_count
  from auth.users u
  where lower(u.email) = lower(trim(owner_email));

  if matching_user_count <> 1 then
    raise exception 'Expected exactly one existing Supabase Auth user for the configured email; found %', matching_user_count;
  end if;

  select u.id into target_user_id
  from auth.users u
  where lower(u.email) = lower(trim(owner_email));

  if exists (
    select 1
    from public.workshop_memberships m
    where m.user_id = target_user_id and m.status = 'active'
  ) then
    raise exception 'The target user already has an active workshop membership; stop and review manually';
  end if;

  if exists (
    select 1 from public.workshops w
    where lower(w.slug) = workshop_slug
  ) then
    raise exception 'The workshop slug is already in use; choose a unique slug';
  end if;

  insert into public.workshops (name, slug, status)
  values (trim(workshop_name), workshop_slug, 'active')
  returning id into created_workshop_id;

  insert into public.workshop_memberships (workshop_id, user_id, role, status)
  values (created_workshop_id, target_user_id, 'owner', 'active');

  raise notice 'Created workshop % and assigned owner membership to Auth user %',
    created_workshop_id, target_user_id;
end
$$;

-- After execution, independently verify only the intended owner and workshop:
-- select w.id as workshop_id, w.name, w.slug, m.user_id, u.email, m.role, m.status
-- from public.workshops w
-- join public.workshop_memberships m on m.workshop_id = w.id
-- join auth.users u on u.id = m.user_id
-- where w.slug = 'replace-with-workshop-slug'
--   and lower(u.email) = lower('REPLACE WITH OWNER EMAIL');
