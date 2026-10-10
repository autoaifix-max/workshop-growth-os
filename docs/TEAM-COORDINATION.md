# Team Coordination and Change Control

Tracking issue: https://github.com/autoaifix-max/workshop-growth-os/issues/23

## Shared source of truth
GitHub Issues are the task ledger; branches isolate work; pull requests are the only integration path; GitHub Actions is the evidence for code gates. Conversation history is not the canonical task state.

## Global change policy
- No direct writes to `main`; every code/documentation change goes through a focused PR.
- Do not merge PRs or deploy without explicit owner approval.
- Do not alter production Supabase data, schema, RLS policies, authentication, or grants without explicit approval.
- Never disable RLS or weaken tenant isolation as a shortcut.
- Destructive changes, shared API contracts, secrets, and permissions require a separate review and approval.
- The initial pilot is our internal diagnostics center. It must use the same tenant and authorization boundaries as every later customer; no hard-coded tenant bypass.

## Workstream ownership (initial; refine per issue before work starts)

| Team | Owns | Must not change without coordination |
|---|---|---|
| A — Platform, security, quality | `supabase/migrations/**`, `src/lib/api/tenant-context.ts`, auth/session code, CI workflows, security/integration tests, architecture contracts | Product UI/domain files owned by B/C; production configuration |
| B — Workshop operations | Customer/vehicle/booking/work-order domain handlers and workflows explicitly assigned in each issue | Migrations, tenant context, RLS/authz, shared response contracts |
| C — RTL UI and automation | Assigned `src/app/**/page.tsx`, presentation components, client-side experience, notification/integration adapters | Database policies/schema, authz, shared API contracts |
| D — Commercial growth | Product copy, onboarding, packages/pricing research, growth experiments, competitor evidence and sales assets | Core APIs, database/auth/security, production settings |

A path is not exclusively owned until the relevant task issue names it. If a task touches another team's path, pause and agree on the change in the issue before editing.

## Required task template
- Owner/team:
- Goal and non-goals:
- Allowed paths:
- Forbidden/shared paths:
- Dependencies:
- Acceptance criteria:
- Tests/evidence:
- Branch and PR:
- Status/blocker:

## Required integration gates
1. Inspect current repository, branch, PRs and existing implementation before editing.
2. Each workstream uses its own branch and small PR; do not duplicate another open task.
3. CI: install, dependency audit, lint, typecheck, unit tests, build.
4. Integration: customer → vehicle → booking → work order.
5. Multi-tenant: two synthetic workshops; cross-tenant read/write denied; role authorization verified.
6. Performance and failure behavior checked; no partial success on database errors.
7. Review diffs and evidence; merge and deploy remain separately gated.

## Supabase investigation — target date 2026-10-12
Read-only inspection first. Resolve which Supabase project the repository/deployment actually uses before changing any remote project.

Initial observations (2026-10-10):
- Project `telujupehfhvsfrtirzn` named `Workshop-Growth-os` is healthy, but the connected account exposes zero public tables and zero migrations. Do not assume this is the target.
- Project `vzsbyrtqxgvsbttfeazb` named `workshop-growth-os` is healthy and has the core workshop/customer/vehicle/booking/work-order tables with RLS enabled; remote migration history currently lists migrations through `index_foreign_keys` (six entries).
- Repository README lists `0007_optimize_rls_auth_uid.sql` as the next migration, so a likely discrepancy to verify is whether migration 0007 is missing remotely. This is not proof of the reported runtime error and must not trigger an automatic production migration.
- No project was modified by this investigation.

Safe resolution sequence:
1. Confirm the project's ref in the active app environment variables and hosting settings without printing secrets.
2. Compare all repository migration files to the remote migration ledger and inspect the exact failing request/error.
3. Reproduce in ephemeral PostgreSQL/test project; classify project mismatch vs missing migration vs RLS/session/grant/config issue.
4. Implement the smallest reversible code/migration fix on a branch and verify customer → vehicle → booking → work order plus two-workshop isolation.
5. Only after review and explicit approval consider any production migration or deployment.

## Hosting transition
Netlify is a proposed temporary replacement for Vercel, not yet verified. Do not switch DNS, secrets, production traffic, or deploy until a Netlify site/account is identified and a preview deployment passes. Keep current production untouched.
