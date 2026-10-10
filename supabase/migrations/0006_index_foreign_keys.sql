-- Cover foreign-key columns used for joins and referential checks.
-- Existing tenant-leading indexes are retained for the application's workshop-scoped list queries.
create index if not exists customers_created_by_idx
  on public.customers (created_by);

create index if not exists vehicles_created_by_idx
  on public.vehicles (created_by);
create index if not exists vehicles_customer_workshop_idx
  on public.vehicles (customer_id, workshop_id);

create index if not exists bookings_created_by_idx
  on public.bookings (created_by);
create index if not exists bookings_customer_workshop_idx
  on public.bookings (customer_id, workshop_id);
create index if not exists bookings_vehicle_workshop_idx
  on public.bookings (vehicle_id, workshop_id);

create index if not exists work_orders_created_by_idx
  on public.work_orders (created_by);
create index if not exists work_orders_booking_workshop_idx
  on public.work_orders (booking_id, workshop_id);
create index if not exists work_orders_customer_workshop_idx
  on public.work_orders (customer_id, workshop_id);
create index if not exists work_orders_vehicle_workshop_idx
  on public.work_orders (vehicle_id, workshop_id);
