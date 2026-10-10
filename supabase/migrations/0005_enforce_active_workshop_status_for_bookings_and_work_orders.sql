-- Extend active-workshop enforcement to bookings and work orders.
-- The previous active-workshop migration tightened workshops, customers, and vehicles.
-- These policies must also block direct queries against operational records for suspended/closed workshops.

drop policy if exists "members read bookings" on public.bookings;
create policy "members read bookings in active workshops" on public.bookings
for select to authenticated
using (exists (
  select 1
  from public.workshop_memberships m
  join public.workshops w on w.id = m.workshop_id and w.status = 'active'
  where m.workshop_id = bookings.workshop_id
    and m.user_id = auth.uid()
    and m.status = 'active'
));

drop policy if exists "staff create bookings" on public.bookings;
create policy "staff create bookings in active workshops" on public.bookings
for insert to authenticated
with check (
  created_by = auth.uid() and exists (
    select 1
    from public.workshop_memberships m
    join public.workshops w on w.id = m.workshop_id and w.status = 'active'
    where m.workshop_id = bookings.workshop_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner','admin','receptionist')
  )
);

drop policy if exists "staff update bookings" on public.bookings;
create policy "staff update bookings in active workshops" on public.bookings
for update to authenticated
using (exists (
  select 1
  from public.workshop_memberships m
  join public.workshops w on w.id = m.workshop_id and w.status = 'active'
  where m.workshop_id = bookings.workshop_id
    and m.user_id = auth.uid()
    and m.status = 'active'
    and m.role in ('owner','admin','receptionist')
))
with check (exists (
  select 1
  from public.workshop_memberships m
  join public.workshops w on w.id = m.workshop_id and w.status = 'active'
  where m.workshop_id = bookings.workshop_id
    and m.user_id = auth.uid()
    and m.status = 'active'
    and m.role in ('owner','admin','receptionist')
));

drop policy if exists "members read work orders" on public.work_orders;
create policy "members read work orders in active workshops" on public.work_orders
for select to authenticated
using (exists (
  select 1
  from public.workshop_memberships m
  join public.workshops w on w.id = m.workshop_id and w.status = 'active'
  where m.workshop_id = work_orders.workshop_id
    and m.user_id = auth.uid()
    and m.status = 'active'
));

drop policy if exists "staff create work orders" on public.work_orders;
create policy "staff create work orders in active workshops" on public.work_orders
for insert to authenticated
with check (
  created_by = auth.uid() and exists (
    select 1
    from public.workshop_memberships m
    join public.workshops w on w.id = m.workshop_id and w.status = 'active'
    where m.workshop_id = work_orders.workshop_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner','admin','receptionist','technician')
  )
);

drop policy if exists "staff update work orders" on public.work_orders;
create policy "staff update work orders in active workshops" on public.work_orders
for update to authenticated
using (exists (
  select 1
  from public.workshop_memberships m
  join public.workshops w on w.id = m.workshop_id and w.status = 'active'
  where m.workshop_id = work_orders.workshop_id
    and m.user_id = auth.uid()
    and m.status = 'active'
    and m.role in ('owner','admin','receptionist','technician')
))
with check (exists (
  select 1
  from public.workshop_memberships m
  join public.workshops w on w.id = m.workshop_id and w.status = 'active'
  where m.workshop_id = work_orders.workshop_id
    and m.user_id = auth.uid()
    and m.status = 'active'
    and m.role in ('owner','admin','receptionist','technician')
));
