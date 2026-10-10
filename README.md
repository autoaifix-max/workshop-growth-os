# Workshop Growth OS

Arabic-first, multi-workshop SaaS for automotive repair operations.

## Current implementation slice
- Next.js App Router and TypeScript.
- `GET /api/v1/health` health endpoint.
- Customer and vehicle list/create endpoints under `/api/v1`.
- Bookings list/create/status-update endpoints at `/api/v1/bookings`.
- Work-order listing and booking conversion at `/api/v1/work-orders`.
- Work-order schema and tenant RLS: `supabase/migrations/0003_work_orders.sql`.
- Arabic RTL bookings admin page at `/admin/bookings`, reading and updating bookings through the API.
- Supabase Auth session and membership-derived workshop context.
- Core schema: `supabase/migrations/0001_core_customers_vehicles.sql`.
- Bookings schema and tenant RLS: `supabase/migrations/0002_bookings.sql`.

## Bookings API contract
All endpoints require a valid Supabase user session and exactly one active workshop membership. Responses use `{ ok, data, error }`; workshop scope is derived from membership, never accepted from request input.

- `GET /api/v1/bookings?limit=25&status=pending&customerId=<uuid>`
- `POST /api/v1/bookings` with JSON: `{ "customerId": "<uuid>", "vehicleId": "<optional uuid>", "requestedService": "فحص كمبيوتر", "scheduledAt": "2026-10-12T09:00:00+03:00", "notes": "" }`
- `PATCH /api/v1/bookings` with JSON: `{ "id": "<booking uuid>", "status": "confirmed" }`

Allowed statuses: `pending`, `confirmed`, `in_progress`, `completed`, `cancelled`. Only workshop owners, admins, and receptionists may create or change booking status. Customers and optional vehicles are checked against the active workshop before insertion.

- `GET /api/v1/work-orders?limit=25`
- `POST /api/v1/work-orders` with JSON: `{ "bookingId": "<booking uuid>" }`; creates at most one work order per booking and moves the booking to `in_progress`.

## Local setup
1. Use Node.js 22 and npm.
2. Copy `.env.example` to `.env.local`.
3. Set the Supabase project URL and anon key.
4. Apply `0001_core_customers_vehicles.sql`, then `0002_bookings.sql`, then `0003_work_orders.sql` to a test Supabase project.
5. Create a workshop and membership for a test user through a controlled admin process. Public tenant bootstrap is not included.
6. Run `npm install`, then `npm run dev`, and visit `http://localhost:3000/admin/bookings`.

## Verification
Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Do not treat an empty status response as a pass. Changes must remain unmerged until CI finishes successfully.

## Known limitations
- The migrations have not been applied to a live Supabase project in this change; runtime database connectivity remains unverified.
- The booking dashboard requires a signed-in user with one active workshop membership; login and tenant onboarding screens are not included here.
- Customer-facing booking creation, WhatsApp sending, audit events, and end-to-end/two-tenant integration tests remain outstanding. Work-order conversion exists at API level but has not yet been verified against a live database.
- Never expose Supabase service-role credentials in browser code or application routes.
