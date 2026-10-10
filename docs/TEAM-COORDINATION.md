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

Verified observations (2026-10-10):
- Project `telujupehfhvsfrtirzn` named `Workshop-Growth-os` is healthy, but the connected account exposes zero public tables and zero migrations. It is not the likely application database.
- Project `vzsbyrtqxgvsbttfeazb` named `workshop-growth-os` is healthy and has the expected workshop/customer/vehicle/booking/work-order tables; RLS is enabled on all six tenant tables. Remote migration history has six entries through `index_foreign_keys`.
- Supabase Security Advisor returned no findings for `vzsbyrtqxgvsbttfeazb`.
- Performance Advisor reports 12 `auth_rls_initplan` warnings because policies evaluate `auth.uid()` per row. Repository migration `0007_optimize_rls_auth_uid.sql` is specifically designed to replace these calls with `(select auth.uid())` while retaining the existing tenant and role predicates. This is the leading safe remediation; it improves policy evaluation without relaxing access controls.
- Migration 0007 is not recorded in the remote migration history. This explains the outstanding performance warnings if `vzsbyrtqxgvsbttfeazb` is the deployed target, but it does not by itself prove the user's reported runtime failure.
- No Supabase project was modified during this investigation.

Safe resolution sequence:
1. Confirm the project's ref in the active app environment variables and hosting settings without printing secret values.
2. Reproduce the reported error and inspect relevant logs; distinguish performance warnings from functional errors.
3. Apply migration 0007 to isolated PostgreSQL and rerun the existing two-workshop RLS integration test.
4. Confirm the target project, review the diff, and obtain explicit approval before applying the migration to any production project.
5. Verify customer → vehicle → booking → work order and two-workshop isolation after the approved change.

## Hosting transition
Netlify is the proposed temporary replacement for Vercel, but no Netlify project matching `workshop-growth-os` was found among the connected Netlify projects. Existing projects are unrelated. Do not create/switch production traffic, alter DNS/secrets, or deploy until a dedicated site linked to this repository is explicitly identified and a preview deployment passes.
