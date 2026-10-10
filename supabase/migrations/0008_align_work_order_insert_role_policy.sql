-- Match direct Supabase work-order inserts to the API authorization contract.
-- The API returns 403 for technicians on POST /api/v1/work-orders.
-- Technicians retain update permission for existing work orders.

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
      and m.role in ('owner','admin','receptionist')
  )
);
