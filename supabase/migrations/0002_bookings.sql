-- Required unique key for the composite vehicle/workshop foreign key below.
create unique index if not exists vehicles_id_workshop_unique on public.vehicles(id, workshop_id);

create table if not exists public.bookings (
 id uuid primary key default gen_random_uuid(),
 workshop_id uuid not null references public.workshops(id) on delete cascade,
 customer_id uuid not null,
 vehicle_id uuid,
 requested_service text not null check (char_length(trim(requested_service)) between 2 and 160),
 scheduled_at timestamptz not null,
 status text not null default 'pending' check (status in ('pending','confirmed','in_progress','completed','cancelled')),
 notes text not null default '' check (char_length(notes) <= 2000),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key (customer_id, workshop_id) references public.customers(id, workshop_id) on delete restrict,
 foreign key (vehicle_id, workshop_id) references public.vehicles(id, workshop_id) on delete restrict
);
create index if not exists bookings_workshop_scheduled_idx on public.bookings(workshop_id, scheduled_at);
create index if not exists bookings_workshop_status_idx on public.bookings(workshop_id, status, scheduled_at);
alter table public.bookings enable row level security;
create policy "members read bookings" on public.bookings for select to authenticated using (
 exists (select 1 from public.workshop_memberships m where m.workshop_id = bookings.workshop_id and m.user_id = auth.uid() and m.status = 'active')
);
create policy "staff create bookings" on public.bookings for insert to authenticated with check (
 created_by = auth.uid() and exists (select 1 from public.workshop_memberships m where m.workshop_id = bookings.workshop_id and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner','admin','receptionist'))
);
create policy "staff update bookings" on public.bookings for update to authenticated using (
 exists (select 1 from public.workshop_memberships m where m.workshop_id = bookings.workshop_id and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner','admin','receptionist'))
) with check (
 exists (select 1 from public.workshop_memberships m where m.workshop_id = bookings.workshop_id and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner','admin','receptionist'))
);
grant select, insert, update on public.bookings to authenticated;
