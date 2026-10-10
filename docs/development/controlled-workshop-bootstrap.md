# Controlled first-workshop bootstrap (operator-only)

This procedure is a temporary, auditable alternative to a public tenant-bootstrap endpoint. It does **not** create an unauthenticated application route and it must never be run against production until the project reference and intended environment have been explicitly confirmed.

## Preconditions

- Confirm the Supabase project reference in the hosting configuration without printing any secret values. Stop if the target is ambiguous.
- Prefer a disposable development/test project. Do not use production for this procedure during the current verification phase.
- Confirm migrations `0001_core_customers_vehicles.sql` through the migration set required by the current application have already been applied. Do not apply migrations as part of onboarding.
- Create/invite the intended owner through **Supabase Authentication → Users**. Do not insert directly into `auth.users`. Copy the resulting Auth user UUID from the dashboard.
- Use the Supabase SQL Editor as a trusted project administrator. Never place a service-role key in browser code, app responses, or source control.

## One-time transaction

Replace all three placeholders below before execution. Use a unique lowercase slug that matches `^[a-z0-9][a-z0-9-]{1,62}$`. Review the project name/ref and owner UUID in the editor before running.

```sql
begin;

with new_workshop as (
  insert into public.workshops (name, slug, status)
  values ('REPLACE_WITH_WORKSHOP_NAME', 'replace-with-unique-slug', 'active')
  returning id
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

-- Inspect the returned row and confirm it matches the intended test workshop/owner.
-- Commit only after that check; otherwise run ROLLBACK.
commit;
```

If any statement fails, the transaction should be rolled back by the SQL client; explicitly run `rollback;` if the transaction remains open. Do not rerun blindly: first check whether a workshop with the chosen slug or a membership already exists.

## Verification after bootstrap

1. Sign in as the invited owner through the application.
2. Confirm the server derives `workshop_id` from the authenticated user's single active membership. Never accept a client-supplied `workshop_id` as authority.
3. Confirm a user with no active membership receives a denial and a user with multiple active memberships receives the explicit selection-required response.
4. Run the customer → vehicle → booking → work-order journey in the isolated test environment.
5. Run the two-workshop RLS integration suite and verify cross-workshop reads/writes are denied.
6. Record the environment, test run, and outcome. Mocked API tests are not live Supabase verification.

## Explicitly out of scope

- No public or unauthenticated bootstrap endpoint.
- No production database changes, schema changes, or migration application.
- No RLS weakening, role bypass, or service-role credential exposure.
- No claim that the bootstrap has been executed; this document describes an operator procedure only.
