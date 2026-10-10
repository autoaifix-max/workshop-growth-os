# Controlled first-workshop bootstrap (operator-only)

This procedure is a temporary, auditable alternative to a public tenant-bootstrap endpoint. It does **not** create an unauthenticated application route and it must never be run against production during this verification phase.

## Preconditions

- Confirm the Supabase project reference in the hosting configuration without printing any secret values. Stop if the target is ambiguous.
- Use a disposable development/test project only for this phase. Do not run this procedure against production.
- Confirm the required migrations have already been applied. Do not apply migrations as part of onboarding.
- Create/invite the intended owner through **Supabase Authentication → Users**. Do not insert directly into `auth.users`. Copy the resulting Auth user UUID from the dashboard.
- For invitation links, configure Supabase Auth's allowed redirect URLs to include `https://workshop-growth-os.netlify.app/auth/callback` and set this as the invite redirect. The callback exchanges the invitation code for a session, then routes the invited user to `/set-password`. Confirm the actual site URL and redirect allow-list before sending the invite.
- Use the Supabase SQL Editor as a trusted project administrator. Never place a service-role key in browser code, app responses, or source control.

## Step 1 — Preflight (read-only)

Replace the example UUID and slug with the intended values, then run this read-only query first. Confirm the owner exists and the slug is unused. Stop if the project, owner, or slug is ambiguous.

```sql
select
  u.id as owner_user_id,
  exists (
    select 1 from public.workshops w
    where w.slug = 'replace-with-unique-slug'
  ) as slug_already_exists
from auth.users u
where u.id = 'REPLACE_WITH_AUTH_USER_UUID'::uuid;
```

The query must return exactly one row and `slug_already_exists` must be `false`. If it returns zero rows, do not proceed. If the slug exists, choose a new slug; do not rerun the write blindly.

## Step 2 — Explicitly reviewed transaction

Only after the read-only preflight is correct, replace the three placeholders below with the reviewed workshop name, unused slug, and Auth user UUID. Recheck the SQL Editor's project reference immediately before running. This script commits as a single transaction; do not execute it until the values and target project have been reviewed.

```sql
begin;

with new_workshop as (
  insert into public.workshops (name, slug, status)
  values ('REPLACE_WITH_WORKSHOP_NAME', 'replace-with-unique-slug', 'active')
  returning id, name, slug
),
new_membership as (
  insert into public.workshop_memberships (workshop_id, user_id, role, status)
  select id, 'REPLACE_WITH_AUTH_USER_UUID'::uuid, 'owner', 'active'
  from new_workshop
  returning workshop_id, user_id, role, status
)
select
  w.id as workshop_id,
  w.name as workshop_name,
  w.slug,
  m.user_id as owner_user_id,
  m.role,
  m.status as membership_status
from new_workshop w
join new_membership m on m.workshop_id = w.id;

commit;
```

If any statement fails, the transaction must not be considered successful. Explicitly roll back if the SQL client leaves the transaction open. After execution, independently query the workshop and membership by the chosen slug and owner UUID to confirm exactly one matching record exists. Do not rerun blindly if the outcome is unclear.

## Verification after bootstrap

1. Sign in as the invited owner through the application.
2. Confirm the server derives `workshop_id` from the authenticated user's active membership. Never accept a client-supplied `workshop_id` as authority.
3. Confirm a user with no active membership receives a denial and a user with multiple active memberships receives the explicit selection-required response.
4. Run the customer → vehicle → booking → work-order journey in the isolated test environment.
5. Run the two-workshop RLS integration suite and verify cross-workshop reads/writes are denied.
6. Record the environment, test run, and outcome. Mocked API tests are not live Supabase verification.

## Explicitly out of scope

- No public or unauthenticated bootstrap endpoint.
- No production database changes, schema changes, or migration application.
- No RLS weakening, role bypass, or service-role credential exposure.
- No claim that the bootstrap has been executed; this document describes an operator procedure only.
