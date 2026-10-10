-- Ensure suspended/closed workshops cannot access operational records through direct Supabase queries.
drop policy if exists "members read own workshops" on public.workshops;
create policy "members read active own workshops" on public.workshops for select to authenticated
using (status = 'active' and exists (
  select 1 from public.workshop_memberships m
  where m.workshop_id = workshops.id and m.user_id = auth.uid() and m.status = 'active'
));

drop policy if exists "members read customers" on public.customers;
create policy "members read customers in active workshops" on public.customers for select to authenticated
using (exists (
  select 1 from public.workshop_memberships m
  join public.workshops w on w.id = m.workshop_id and w.status = 'active'
  where m.workshop_id = customers.workshop_id and m.user_id = auth.uid() and m.status = 'active'
));

drop policy if exists "staff create customers" on public.customers;
create policy "staff create customers in active workshops" on public.customers for insert to authenticated
with check (
  created_by = auth.uid() and exists (
    select 1 from public.workshop_memberships m
    join public.workshops w on w.id = m.workshop_id and w.status = 'active'
    where m.workshop_id = customers.workshop_id and m.user_id = auth.uid()
      and m.status = 'active' and m.role in ('owner','admin','receptionist')
  )
);

drop policy if exists "members read vehicles" on public.vehicles;
create policy "members read vehicles in active workshops" on public.vehicles for select to authenticated
using (exists (
  select 1 from public.workshop_memberships m
  join public.workshops w on w.id = m.workshop_id and w.status = 'active'
  where m.workshop_id = vehicles.workshop_id and m.user_id = auth.uid() and m.status = 'active'
));

drop policy if exists "staff create vehicles" on public.vehicles;
create policy "staff create vehicles in active workshops" on public.vehicles for insert to authenticated
with check (
  created_by = auth.uid() and exists (
    select 1 from public.workshop_memberships m
    join public.workshops w on w.id = m.workshop_id and w.status = 'active'
    where m.workshop_id = vehicles.workshop_id and m.user_id = auth.uid()
      and m.status = 'active' and m.role in ('owner','admin','receptionist','technician')
  )
);
