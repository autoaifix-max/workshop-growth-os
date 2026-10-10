# Digital DiagPro reuse review

Review date: 2026-10-10. Source branch: autoaifix-max/digital-diagpro/main.
Scope: package manifest, schema/security docs, selected migrations, customer/vehicle API routes, auth guards, validation schemas and the committed test report.
Method: static source review only; no code execution or live database testing.

## Decision
Reuse selected domain concepts and workflow patterns as reference material. Do not copy the pilot wholesale or consider it ready for multi-workshop SaaS.

## Strengths observed
- Next.js App Router, TypeScript, Supabase SSR, pinned dependencies and a lockfile.
- Zod validation for customer and vehicle input.
- Customer and vehicle create handlers take workshop identity from the authenticated staff profile.
- RLS policies, private document storage, role checks, status transitions, audit events and workflow RPCs exist.
- Domain transition and validation tests exist. The committed test report states checks passed on 2026-07-14; this review did not rerun them.

## Risks before reuse
1. Pilot-specific assumptions remain: the public booking RPC selects the active default workshop; migration 008 bootstraps a first administrator using a fixed email and workshop UUID. Replace these with tenant-aware onboarding and routing.
2. Review every RLS policy, table grant, trigger and SECURITY DEFINER function before adapting SQL. Validate function ownership, role checks, workshop scoping, search_path and EXECUTE grants.
3. Add automated two-workshop negative tests, including forged record IDs, cross-tenant foreign keys, customer portal access and staff-role boundaries.
4. The public booking function validates fields and service availability, but the reviewed function does not itself establish rate limiting or bot protection. Add edge/API abuse controls before public launch.
5. Apply tenant-consistency checks to every related entity on writes: customer, vehicle, booking, work order, staff, approval and document.
6. Re-run lint, typecheck, tests, build, package verification and dependency audit from a clean checkout. The existing report is historical evidence, not a current result.
7. Before production, complete the source project's own operational checklist: MFA, password protection settings, backups/retention, and real customer-isolation tests.

## Reuse matrix
| Area | Decision | Condition |
|---|---|---|
| Customer/vehicle fields and Saudi phone validation | Adapt | Recheck PII, uniqueness and tenant relationships |
| Booking/work-order transitions | Adapt | Preserve transactional updates, status history and idempotency |
| Diagnostics, approvals and quality workflows | Adapt later | Review privileged SQL functions and role matrix first |
| Supabase SSR and Zod patterns | Reuse selectively | Align error handling and application conventions |
| RLS and storage policies | Reference, then adapt | Require two-tenant negative tests |
| Pilot bootstrap and default-workshop booking | Do not reuse as-is | Replace pilot assumptions |
| Existing UI | Selective reuse only | Confirm usability and maintainability first |

## Gate before importing implementation
- Enumerate all SECURITY DEFINER functions, triggers, policies and grants in migrations 001–010.
- Confirm tenant-owned tables have RLS and no policy widens access unexpectedly.
- Add database tests for two workshops, staff roles, customer ownership and cross-tenant references.
- Test public booking abuse, duplicate submissions, inactive services and concurrent requests.
- Run npm ci, lint, typecheck, test:run, build, verify:package and npm audit.
- Keep environment credentials, production records and pilot identifiers out of the new application.

## Next step
Implement the first operational slice in Workshop Growth OS: Customers + Vehicles, on the shared authentication, membership and tenant-isolation foundation. Use reviewed domain and validation patterns, but target the new versioned API contract and multi-tenant tests. Do not import pilot migrations until the security review and test strategy are complete.

## Limitations
This is a preliminary static review, not a penetration test or a claim that the source is secure. No production data was accessed and no tests were run during this review.
