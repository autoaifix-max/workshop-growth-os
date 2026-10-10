-- Work orders created from confirmed bookings; one work order per booking.
create unique index if not exists bookings_id_workshop_unique on public.bookings(id, workshop_id);

create table if not exists public.work_orders (
 id uuid primary key default gen_random_uuid(),
 workshop_id uuid not null references public.workshops(id) on delete cascade,
 booking_id uuid not null unique,
 customer_id uuid not null,
 vehicle_id uuid,
 requested_service text not null check (char_length(trim(requested_service)) between 2 and 160),
 status text not null default 'open' check (status in ('open','diagnosing','waiting_parts','in_progress','completed','cancelled')),
 notes text not null default '' check (char_length(notes) <= 4000),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key (booking_id, workshop_id) references public.bookings(id, workshop_id) on delete restrict,
 foreign key (customer_id, workshop_id) references public.customers(id, workshop_id) on delete restrict,
 foreign key (vehicle_id, workshop_id) references public.vehicles(id, workshop_id) on delete restrict
);
create index if not exists work_orders_workshop_status_idx on public.work_orders(workshop_id, status, created_at desc);
alter table public.work_orders enable row level security;
create policy "members read work orders" on public.work_orders for select to authenticated using (
 exists (select 1 from public.workshop_memberships m where m.workshop_id = work_orders.workshop_id and m.user_id = auth.uid() and m.status = 'active')
);
create policy "staff create work orders" on public.work_orders for insert to authenticated with check (
 created_by = auth.uid() and exists (select 1 from public.workshop_memberships m where m.workshop_id = work_orders.workshop_id and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner','admin','receptionist','technician'))
);
create policy "staff update work orders" on public.work_orders for update to authenticated using (
 exists (select 1 from public.workshop_memberships m where m.workshop_id = work_orders.workshop_id and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner','admin','receptionist','technician'))
) with check (
 exists (select 1 from public.workshop_memberships m where m.workshop_id = work_orders.workshop_id and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner','admin','receptionist','technician'))
);
grant select, insert, update on public.work_orders to authenticated;
