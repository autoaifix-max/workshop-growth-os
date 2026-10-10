-- Negative tests run only against the disposable PostgreSQL database created by CI.
-- They verify both tenant RLS and composite foreign-key tenant integrity.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222'),
 ('33333333-3333-4333-8333-333333333333');
insert into public.workshops(id,name,slug,status) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Workshop A','workshop-a','active'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Workshop B','workshop-b','active');
insert into public.workshop_memberships(workshop_id,user_id,role,status) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','owner','active'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','owner','active');
insert into public.customers(id,workshop_id,full_name,phone,created_by) values
 ('aaaaaaaa-0001-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Customer A','0500000001','11111111-1111-4111-8111-111111111111'),
 ('bbbbbbbb-0001-4000-8000-000000000001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Customer B','0500000002','22222222-2222-4222-8222-222222222222');
insert into public.vehicles(id,workshop_id,customer_id,plate_number,make,model,created_by) values
 ('aaaaaaaa-0002-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','aaaaaaaa-0001-4000-8000-000000000001','A-100','Toyota','Camry','11111111-1111-4111-8111-111111111111'),
 ('bbbbbbbb-0002-4000-8000-000000000001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','bbbbbbbb-0001-4000-8000-000000000001','B-200','Honda','Accord','22222222-2222-4222-8222-222222222222');
insert into public.bookings(id,workshop_id,customer_id,vehicle_id,requested_service,scheduled_at,created_by) values
 ('aaaaaaaa-0003-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','aaaaaaaa-0001-4000-8000-000000000001','aaaaaaaa-0002-4000-8000-000000000001','Diagnostic A',now(),'11111111-1111-4111-8111-111111111111'),
 ('bbbbbbbb-0003-4000-8000-000000000001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','bbbbbbbb-0001-4000-8000-000000000001','bbbbbbbb-0002-4000-8000-000000000001','Diagnostic B',now(),'22222222-2222-4222-8222-222222222222');
insert into public.work_orders(id,workshop_id,booking_id,customer_id,vehicle_id,requested_service,created_by) values
 ('aaaaaaaa-0004-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','aaaaaaaa-0003-4000-8000-000000000001','aaaaaaaa-0001-4000-8000-000000000001','aaaaaaaa-0002-4000-8000-000000000001','Diagnostic A','11111111-1111-4111-8111-111111111111'),
 ('bbbbbbbb-0004-4000-8000-000000000001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','bbbbbbbb-0003-4000-8000-000000000001','bbbbbbbb-0001-4000-8000-000000000001','bbbbbbbb-0002-4000-8000-000000000001','Diagnostic B','22222222-2222-4222-8222-222222222222');
insert into public.bookings(id,workshop_id,customer_id,vehicle_id,requested_service,scheduled_at,created_by) values ('bbbbbbbb-0005-4000-8000-000000000001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','bbbbbbbb-0001-4000-8000-000000000001','bbbbbbbb-0002-4000-8000-000000000001','Diagnostic B2',now(),'22222222-2222-4222-8222-222222222222');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
declare n integer;
begin
 select count(*) into n from public.customers; if n <> 1 then raise exception 'customer read isolation failed'; end if;
 select count(*) into n from public.vehicles; if n <> 1 then raise exception 'vehicle read isolation failed'; end if;
 select count(*) into n from public.bookings; if n <> 1 then raise exception 'booking read isolation failed'; end if;
 select count(*) into n from public.work_orders; if n <> 1 then raise exception 'work-order read isolation failed'; end if;
 begin
  insert into public.customers(workshop_id,full_name,phone,created_by)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Cross Tenant','0500000099','11111111-1111-4111-8111-111111111111');
  raise exception 'RLS allowed cross-workshop customer insert';
 exception when insufficient_privilege then null;
 end;
 begin
  insert into public.vehicles(workshop_id,customer_id,plate_number,make,model,created_by)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-0001-4000-8000-000000000001','A-999','Toyota','Yaris','11111111-1111-4111-8111-111111111111');
  raise exception 'Composite FK allowed cross-workshop vehicle/customer link';
 exception when foreign_key_violation then null;
 end;
 begin
  insert into public.bookings(workshop_id,customer_id,vehicle_id,requested_service,scheduled_at,created_by)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','aaaaaaaa-0001-4000-8000-000000000001','bbbbbbbb-0002-4000-8000-000000000001','Cross Tenant Vehicle',now(),'11111111-1111-4111-8111-111111111111');
  raise exception 'Composite FK allowed cross-workshop booking/vehicle link';
 exception when foreign_key_violation then null;
 end;
 begin
  insert into public.work_orders(workshop_id,booking_id,customer_id,requested_service,created_by)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-0005-4000-8000-000000000001','aaaaaaaa-0001-4000-8000-000000000001','Cross Tenant Booking','11111111-1111-4111-8111-111111111111');
  raise exception 'Composite FK allowed cross-workshop work-order/booking link';
 exception when foreign_key_violation then null;
 end;
end $;

-- A valid authenticated user with no active workshop membership must not see or mutate tenant data.
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $
declare n integer;
begin
 select count(*) into n from public.customers; if n <> 0 then raise exception 'user without membership can read customers'; end if;
 select count(*) into n from public.vehicles; if n <> 0 then raise exception 'user without membership can read vehicles'; end if;
 select count(*) into n from public.bookings; if n <> 0 then raise exception 'user without membership can read bookings'; end if;
 select count(*) into n from public.work_orders; if n <> 0 then raise exception 'user without membership can read work orders'; end if;
 begin
  insert into public.customers(workshop_id,full_name,phone,created_by)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','No Membership','0500000088','33333333-3333-4333-8333-333333333333');
  raise exception 'RLS allowed customer insert without active membership';
 exception when insufficient_privilege then null;
 end;
end $;
reset role;
rollback;
