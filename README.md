# Workshop Growth OS

Arabic-first, multi-workshop SaaS for automotive repair operations.

## Current implementation slice
- Next.js App Router, TypeScript, Arabic RTL starter dashboard.
- `GET /api/v1/health` health endpoint.
- Customer and vehicle list/create endpoints under `/api/v1`.
- Supabase Auth session and membership-derived workshop context.
- Initial schema and RLS migration: `supabase/migrations/0001_core_customers_vehicles.sql`.
- Input validation tests and GitHub Actions workflow.

## Local setup
1. Use Node.js 22 and npm.
2. Copy `.env.example` to `.env.local`.
3. Set the Supabase project URL and anon key.
4. Apply the migration to a disposable Supabase project before using authenticated APIs.
5. Create a workshop and membership for a test user through a controlled admin process. Public tenant bootstrap is not included.
6. Run `npm install`, then `npm run dev`, and visit `http://localhost:3000`.

## Verification
Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

## Limits
The dashboard is a starter shell, not a finished workflow. The migration has not been applied to a live Supabase project and no build/test pass is claimed until CI reports results. Two-tenant database integration tests, auth screens, tenant onboarding, update/delete, cursor pagination, audit events, bookings and work orders remain outstanding. Never expose Supabase service-role credentials in browser code or application routes.
