\set ON_ERROR_STOP on

-- This test runs only against the ephemeral PostgreSQL service in GitHub Actions.
-- It validates the customer -> vehicle -> booking -> work-order chain and RLS isolation.

insert into auth.users (id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');

insert into public.workshops (id, name, slug, status) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Workshop Alpha', 'workshop-alpha', 'active'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Workshop Beta', 'workshop-beta', 'active');

insert into public.workshop_memberships (id, workshop_id, user_id, role, status) values
  ('a1111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'owner', 'active'),
  ('b2222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-888888888888', '22222222-2222-4222-8222-222222222222', 'owner', 'active');

insert into public.customers (id, workshop_id, full_name, phone, created_by) values
  ('a3333333-3333-4333-8333-333333333333', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Alpha Customer', '+966500000001', '11111111-1111-4111-8111-111111111111'),
  ('b4444444-4444-4444-8444-444444444444', 'bbbbbbbb-bbbb-4bbb-8bbb-888888888888', 'Beta Customer', '+966500000002', '22222222-2222-4222-8222-222222222222');

insert into public.vehicles (id, workshop_id, customer_id, plate_number, make, model, created_by) values
  ('a5555555-5555-4555-8555-555555555555', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a3333333-3333-4333-8333-333333333333', 'ALPHA-1', 'Toyota', 'Camry', '11111111-1111-4111-8111-111111111111'),
  ('b6666666-6666-4666-8666-666666666666', 'bbbbbbbb-bbbb-4bbb-8bbb-888888888888', 'b4444444-4444-4444-8444-444444444444', 'BETA-1', 'Honda', 'Accord', '22222222-2222-4222-8222-222222222222');

insert into public.bookings (id, workshop_id, customer_id, vehicle_id, requested_service, scheduled_at, created_by) values
  ('a7777777-7777-4777-8777-777777777777', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a3333333-3333-4333-8333-333333333333', 'a5555555-5555-4555-8555-555555555555', 'Alpha service', now(), '11111111-1111-4111-8111-111111111111'),
  ('b8888888-8888-4888-8888-888888888888', 'bbbbbbbb-bbbb-4bbb-8bbb-888888888888', 'b4444444-4444-4444-8444-444444444444', 'b6666666-6666-4666-8666-666666666666', 'Beta service', now(), '22222222-2222-4222-8222-222222222222');

insert into public.work_orders (id, workshop_id, booking_id, customer_id, vehicle_id, requested_service, created_by) values
  ('a9999999-9999-4999-8999-999999999999', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a7777777-7777-4777-8777-777777777777', 'a3333333-3333-4333-8333-333333333333', 'a5555555-5555-4555-8555-555555555555', 'Alpha service', '11111111-1111-4111-8111-111111111111'),
  ('b0000000-0000-4000-8000-000000000000', 'bbbbbbbb-bbbb-4bbb-8bbb-888888888888', 'b8888888-8888-4888-8888-888888888888', 'b4444444-4444-4444-8444-444444444444', 'b6666666-6666-4666-8666-666666666666', 'Beta service', '22222222-2222-4222-8222-222222222222');

-- Validate the full relational chain and prevent mismatched tenant/customer/vehicle links.
do $$
begin
  if exists (
    select 1 from public.bookings b
    join public.customers c on c.id = b.customer_id
    left join public.vehicles v on v.id = b.vehicle_id
    where b.workshop_id <> c.workshop_id
       or (b.vehicle_id is not null and (v.id is null or v.workshop_id <> b.workshop_id or v.customer_id <> b.customer_id))
  ) then raise exception 'Booking references a customer or vehicle outside its workshop'; end if;

  if exists (
    select 1 from public.work_orders wo
    join public.bookings b on b.id = wo.booking_id
    where wo.workshop_id <> b.workshop_id
       or wo.customer_id <> b.customer_id
       or wo.vehicle_id is distinct from b.vehicle_id
       or wo.requested_service <> b.requested_service
  ) then raise exception 'Work order does not match its source booking'; end if;

  if exists (
    select booking_id from public.work_orders group by booking_id having count(*) > 1
  ) then raise exception 'More than one work order exists for a booking'; end if;
end $$;

-- A cross-workshop customer link must be rejected by the composite foreign key.
do $$
begin
  begin
    insert into public.vehicles (workshop_id, customer_id, plate_number, make, model, created_by)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'b4444444-4444-4444-8444-444444444444',
      'CROSS-1', 'Toyota', 'Corolla', '11111111-1111-4111-8111-111111111111');
    raise exception 'Cross-workshop customer/vehicle link was unexpectedly accepted';
  exception when foreign_key_violation then
    null;
  end;
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);

do $$
declare
  affected integer;
begin
  if (select count(*) from public.workshops) <> 1 then raise exception 'Alpha user can see another workshop'; end if;
  if (select count(*) from public.workshop_memberships) <> 1 then raise exception 'Alpha user can see another membership'; end if;
  if (select count(*) from public.customers) <> 1 then raise exception 'Alpha user can see another customer'; end if;
  if (select count(*) from public.vehicles) <> 1 then raise exception 'Alpha user can see another vehicle'; end if;
  if (select count(*) from public.bookings) <> 1 then raise exception 'Alpha user can see another booking'; end if;
  if (select count(*) from public.work_orders) <> 1 then raise exception 'Alpha user can see another work order'; end if;
  if exists (select 1 from public.bookings where workshop_id = 'bbbbbbbb-bbbb-4bbb-8bbb-888888888888') then raise exception 'Alpha user read Beta booking'; end if;
  if exists (select 1 from public.work_orders where workshop_id = 'bbbbbbbb-bbbb-4bbb-8bbb-888888888888') then raise exception 'Alpha user read Beta work order'; end if;

  update public.bookings set status = 'cancelled'
  where id = 'b8888888-8888-4888-8888-888888888888';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Alpha user updated a Beta booking'; end if;

  begin
    insert into public.bookings (workshop_id, customer_id, vehicle_id, requested_service, scheduled_at, created_by)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-888888888888', 'b4444444-4444-4444-8444-444444444444',
      'b6666666-6666-4666-8666-666666666666', 'Cross tenant booking', now(), '11111111-1111-4111-8111-111111111111');
    raise exception 'Alpha user inserted a Beta booking';
  exception when insufficient_privilege then
    null;
  end;
end $$;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);

do $$
begin
  if (select count(*) from public.workshops) <> 1 then raise exception 'Beta user can see another workshop'; end if;
  if (select count(*) from public.workshop_memberships) <> 1 then raise exception 'Beta user can see another membership'; end if;
  if (select count(*) from public.customers) <> 1 then raise exception 'Beta user can see another customer'; end if;
  if (select count(*) from public.vehicles) <> 1 then raise exception 'Beta user can see another vehicle'; end if;
  if (select count(*) from public.bookings) <> 1 then raise exception 'Beta user can see another booking'; end if;
  if (select count(*) from public.work_orders) <> 1 then raise exception 'Beta user can see another work order'; end if;
  if exists (select 1 from public.bookings where workshop_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') then raise exception 'Beta user read Alpha booking'; end if;
  if exists (select 1 from public.work_orders where workshop_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') then raise exception 'Beta user read Alpha work order'; end if;
end $$;

reset role;

-- Database policies must also deny technicians booking-creation rights.
update public.workshop_memberships set role = 'technician'
where user_id = '11111111-1111-4111-8111-111111111111';

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);

do $$
begin
  begin
    insert into public.bookings (workshop_id, customer_id, vehicle_id, requested_service, scheduled_at, created_by)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a3333333-3333-4333-8333-333333333333',
      'a5555555-5555-4555-8555-555555555555', 'Technician booking', now(), '11111111-1111-4111-8111-111111111111');
    raise exception 'Technician was unexpectedly allowed to create a booking';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;
select 'Workflow relationships, role authorization, and two-workshop RLS isolation: PASS' as result;
