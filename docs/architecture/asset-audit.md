# Asset audit — updated 2026-10-10

This is a GitHub source review, not a full local checkout or a live security test.

## Workshop Growth OS
The designated platform repository. It contains product scope, modular boundaries, tenant-isolation rules, a draft OpenAPI v1 contract, development gates, and the preliminary Digital DiagPro reuse review. No application runtime has been scaffolded yet.

## Digital DiagPro
Repository: https://github.com/autoaifix-max/digital-diagpro

- Next.js App Router, TypeScript, Tailwind, Supabase SSR, Zod, 10 migrations, API handlers and domain tests.
- Best reference for workshop operations: customers, vehicles, bookings, work orders, diagnostics, approvals, quality, documents and audit logs.
- Customer and vehicle API handlers validate inputs and derive the workshop ID from the authenticated staff profile.
- Security caveat: it remains a pilot with default-workshop assumptions, including public booking against the active default workshop and a fixed pilot admin bootstrap. RLS, grants and every SECURITY DEFINER function must be reviewed and tested before adapting.
- The committed test report records successful checks on 2026-07-14; those checks have not been rerun during this review.
- Detailed findings: [digital-diagpro-reuse-audit.md](digital-diagpro-reuse-audit.md).

## DiagPro Knowledge
Repository: https://github.com/autoaifix-max/diagpro-knowledge

- A 57-entry source tree was visible during review; it contains a Next.js RTL interface, Supabase/pgvector retrieval, embedding generation, Claude-based answers and an ingestion script.
- Best future reference for the diagnostic knowledge module: retrieval, citations and source ingestion.
- Important adaptation requirement: the current server helper creates a Supabase client with the service-role key, and the public question endpoint uses that client for retrieval and query logging. Do not copy this access model into tenant-facing workflows without designing least-privilege access, input limits, rate limiting, abuse controls, and appropriate logging/retention.
- Admin authentication is described as a simple shared password in the project README/environment template. Replace it with the platform's authenticated staff/role model before connecting it to workshop data.
- Decision: keep it behind a future internal service/API boundary; do not merge its database or UI into the core now.

## DiagPro Manager V1
Repository: https://github.com/ahmedzohaidz/diagpro-manager-v1

- The readable Git tree on the default branch contains only `.gitignore`, `AGENTS.md`, and `CLAUDE.md`.
- Those instructions describe an early booking-first concept but explicitly say application scaffolding has not started.
- Decision: useful as a product-scope reference only; not a codebase to adopt until the discrepancy between reported repository size and visible Git tree is explained by a local inspection.

## Consolidated reuse decision

| Asset | Decision |
|---|---|
| Digital DiagPro operational domain, validators and state-machine patterns | Adapt selectively after security review |
| Digital DiagPro RLS and SQL migrations | Reference and rewrite/adapt only with multi-tenant integration tests |
| DiagPro Knowledge retrieval, ingestion and source citation | Future isolated module; redesign authorization first |
| DiagPro Manager V1 | Product requirements only; no application code observed in Git tree |
| Workshop Growth OS | Single destination for the new SaaS implementation |

## Required gate
Before copying operational code, review migrations 001–010 in full; enumerate all privileged functions, policies and grants; test access with two workshops and distinct roles; run a clean install, lint, typecheck, tests, production build, package verification and dependency audit. Do not copy environment files, credentials or production records.
