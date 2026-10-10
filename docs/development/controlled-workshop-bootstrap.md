# Controlled first-workshop bootstrap (operator-only)

This procedure is a temporary, auditable alternative to a public tenant-bootstrap endpoint. It does **not** create an unauthenticated application route and it must never be run against production during this verification phase.

## Preconditions

- Confirm the Supabase project reference in the hosting configuration without printing any secret values. Stop if the target is ambiguous.
- Use a disposable development/test project only for this phase. Do not run this procedure against production.
- Confirm the required migrations have already been applied. Do not apply migrations as part of onboarding.
- Create/invite the intended owner through **Supabase Authentication → Users**. Do not insert directly into `auth.users`. The bootstrap script resolves the Auth UUID from the exact email entered by the operator, avoiding manual UUID copying.
- For invitation links, configure Supabase Auth's allowed redirect URLs to include `https://workshop-growth-os.netlify.app/auth/callback` and set this as the invite redirect. The callback exchanges the invitation code for a session, then routes the invited user to `/set-password`. Confirm the actual site URL and redirect allow-list before sending the invite.
- Use the Supabase SQL Editor as a trusted project administrator. Never place a service-role key in browser code, app responses, or source control.

## Step 1 — Preflight (read-only)

Replace the owner email and slug with the exact values intended for provisioning. Run this query in the SQL Editor after confirming the project reference. It must return exactly one matching Auth user and `slug_already_exists = false`.

```sql
select
  u.id as owner_user_id,
  u.email as owner_email,
  exists (
    select 1 from public.workshops w
    where lower(w.slug) = lower('replace-with-unique-slug')
  ) as slug_already_exists,
  exists (
    select 1 from public.workshop_memberships m
    where m.user_id = u.id and m.status = 'active'
  ) as already_has_active_membership
from auth.users u
where lower(u.email) = lower('REPLACE WITH OWNER EMAIL');
```

Do not proceed unless exactly one row is returned, the slug is unused, and the account has no active workshop membership. Stop if any value or target is ambiguous.

## Step 2 — Reviewed one-time write

Use **only** the canonical script at `supabase/operations/bootstrap-first-workshop.sql`. Replace its three placeholders: owner email, workshop name, and unique workshop slug. Review those values, run the read-only preflight again, then confirm the SQL Editor's project reference immediately before executing the script.

The script resolves the existing Auth user by exact email, validates the slug, refuses to proceed if the account already has an active membership or the slug is taken, and creates the workshop plus its `owner` membership in one PostgreSQL transaction. It is outside `supabase/migrations` and never runs automatically in CI. Rehearse on a disposable project first; production provisioning remains blocked until the explicit release decision.

After execution, independently query the workshop, membership, and Auth email to verify exactly one intended match. If the SQL Editor reports an error or the outcome is unclear, stop and inspect state before retrying. Never rerun blindly.

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
