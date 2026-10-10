-- Evaluate auth.uid() once per statement instead of once per candidate row.
-- Keep the existing tenant and role predicates unchanged.

drop policy if exists "users read own memberships" on public.workshop_memberships;
create policy "users read own memberships" on public.workshop_memberships
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "members read active own workshops" on public.workshops;
create policy "members read active own workshops" on public.workshops
for select to authenticated
using (status = 'active' and exists (
  select 1
  from public.workshop_memberships m
  where m.workshop_id = workshops.id
    and m.user_id = (select auth.uid())
    and m.status = 'active'
));

drop policy if exists "members read customers in active workshops" on public.customers;
create policy "members read customers in active workshops" on public.customers
for select to authenticated
using (exists (
  select 1
  from public.workshop_memberships m
  join public.workshops w on w.id = m.workshop_id and w.status = 'active'
  where m.workshop_id = customers.workshop_id
    and m.user_id = (select auth.uid())
    and m.status = 'active'
));

drop policy if exists "staff create customers in active workshops" on public.customers;
create policy "staff create customers in active workshops" on public.customers
for insert to authenticated
with check (
  created_by = (select auth.uid()) and exists (
    select 1
    from public.workshop_memberships m
    join public.workshops w on w.id = m.workshop_id and w.status = 'active'
    where m.workshop_id = customers.workshop_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('owner','admin','receptionist')
  )
);

drop policy if exists "members read vehicles in active workshops" on public.vehicles;
create policy "members read vehicles in active workshops" on public.vehicles
for select to authenticated
using (exists (
  select 1
  from public.workshop_memberships m
  join public.workshops w on w.id = m.workshop_id and w.status = 'active'
  where m.workshop_id = vehicles.workshop_id
    and m.user_id = (select auth.uid())
    and m.status = 'active'
));

drop policy if exists "staff create vehicles in active workshops" on public.vehicles;
create policy "staff create vehicles in active workshops" on public.vehicles
for insert to authenticated
with check (
  created_by = (select auth.uid()) and exists (
    select 1
    from public.workshop_memberships m
    join public.workshops w on w.id = m.workshop_id and w.status = 'active'
    where m.workshop_id = vehicles.workshop_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('owner','admin','receptionist','technician')
  )
);

drop policy if exists "members read bookings in active workshops" on public.bookings;
create policy "members read bookings in active workshops" on public.bookings
for select to authenticated
using (exists (
  select 1
  from public.workshop_memberships m
  join public.workshops w on w.id = m.workshop_id and w.status = 'active'
  where m.workshop_id = bookings.workshop_id
    and m.user_id = (select auth.uid())
    and m.status = 'active'
));

drop policy if exists "staff create bookings in active workshops" on public.bookings;
create policy "staff create bookings in active workshops" on public.bookings
for insert to authenticated
with check (
  created_by = (select auth.uid()) and exists (
    select 1
    from public.workshop_memberships m
    join public.workshops w on w.id = m.workshop_id and w.status = 'active'
    where m.workshop_id = bookings.workshop_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('owner','admin','receptionist')
  )
);

drop policy if exists "staff update bookings in active workshops" on public.bookings;
create policy "staff update bookings in active workshops" on public.bookings
for update to authenticated
using (exists (
  select 1
  from public.workshop_memberships m
  join public.workshops w on w.id = m.workshop_id and w.status = 'active'
  where m.workshop_id = bookings.workshop_id
    and m.user_id = (select auth.uid())
    and m.status = 'active'
    and m.role in ('owner','admin','receptionist')
))
with check (exists (
  select 1
  from public.workshop_memberships m
  join public.workshops w on w.id = m.workshop_id and w.status = 'active'
  where m.workshop_id = bookings.workshop_id
    and m.user_id = (select auth.uid())
    and m.status = 'active'
    and m.role in ('owner','admin','receptionist')
));

drop policy if exists "members read work orders in active workshops" on public.work_orders;
create policy "members read work orders in active workshops" on public.work_orders
for select to authenticated
using (exists (
  select 1
  from public.workshop_memberships m
  join public.workshops w on w.id = m.workshop_id and w.status = 'active'
  where m.workshop_id = work_orders.workshop_id
    and m.user_id = (select auth.uid())
    and m.status = 'active'
));

drop policy if exists "staff create work orders in active workshops" on public.work_orders;
create policy "staff create work orders in active workshops" on public.work_orders
for insert to authenticated
with check (
  created_by = (select auth.uid()) and exists (
    select 1
    from public.workshop_memberships m
    join public.workshops w on w.id = m.workshop_id and w.status = 'active'
    where m.workshop_id = work_orders.workshop_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('owner','admin','receptionist','technician')
  )
);

drop policy if exists "staff update work orders in active workshops" on public.work_orders;
create policy "staff update work orders in active workshops" on public.work_orders
for update to authenticated
using (exists (
  select 1
  from public.workshop_memberships m
  join public.workshops w on w.id = m.workshop_id and w.status = 'active'
  where m.workshop_id = work_orders.workshop_id
    and m.user_id = (select auth.uid())
    and m.status = 'active'
    and m.role in ('owner','admin','receptionist','technician')
))
with check (exists (
  select 1
  from public.workshop_memberships m
  join public.workshops w on w.id = m.workshop_id and w.status = 'active'
  where m.workshop_id = work_orders.workshop_id
    and m.user_id = (select auth.uid())
    and m.status = 'active'
    and m.role in ('owner','admin','receptionist','technician')
));
