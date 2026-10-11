-- Public service offers and private customer tracking tokens.
create table if not exists public.service_offers (
 id uuid primary key default gen_random_uuid(),
 workshop_id uuid not null references public.workshops(id) on delete cascade,
 marketing_partner_id uuid,
 slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
 title text not null check (char_length(trim(title)) between 2 and 160),
 description text not null default '' check (char_length(description) <= 2000),
 base_price numeric(12,2) not null check (base_price > 0),
 discount_type text not null default 'percent' check (discount_type in ('fixed','percent')),
 discount_value numeric(12,2) not null check (discount_value > 0 and (discount_type <> 'percent' or discount_value <= 100)),
 terms text not null default '' check (char_length(terms) <= 2000),
 starts_at timestamptz,
 expires_at timestamptz,
 status text not null default 'active' check (status in ('active','inactive')),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key (marketing_partner_id, workshop_id) references public.marketing_partners(id, workshop_id) on delete restrict,
 check (expires_at is null or starts_at is null or expires_at > starts_at)
);
create index if not exists service_offers_workshop_status_idx on public.service_offers(workshop_id,status,created_at desc);
alter table public.service_offers enable row level security;
create policy "workshop managers read service offers" on public.service_offers for select to authenticated
 using (exists(select 1 from public.workshop_memberships m where m.workshop_id=service_offers.workshop_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin')));
create policy "workshop managers create service offers" on public.service_offers for insert to authenticated
 with check (created_by=auth.uid() and exists(select 1 from public.workshop_memberships m where m.workshop_id=service_offers.workshop_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin')));
create policy "workshop managers update service offers" on public.service_offers for update to authenticated
 using (exists(select 1 from public.workshop_memberships m where m.workshop_id=service_offers.workshop_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin')))
 with check (exists(select 1 from public.workshop_memberships m where m.workshop_id=service_offers.workshop_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin')));
grant select,insert,update on public.service_offers to authenticated;

create table if not exists public.public_service_tracking (
 id uuid primary key default gen_random_uuid(),
 workshop_id uuid not null references public.workshops(id) on delete cascade,
 booking_id uuid not null,
 token_hash text not null unique,
 created_at timestamptz not null default now(),
 foreign key (booking_id,workshop_id) references public.bookings(id,workshop_id) on delete cascade,
 unique(booking_id)
);
create index if not exists public_service_tracking_booking_idx on public.public_service_tracking(workshop_id,booking_id);
alter table public.public_service_tracking enable row level security;
-- No direct table access is granted to anonymous or authenticated clients. Public access is via narrowly scoped RPCs.

create table if not exists public.service_tracking_events (
 id uuid primary key default gen_random_uuid(),
 workshop_id uuid not null references public.workshops(id) on delete cascade,
 booking_id uuid not null,
 work_order_id uuid,
 event_type text not null check (event_type in ('booking_created','booking_confirmed','vehicle_received','diagnosing','waiting_parts','repairing','quality_check','completed','cancelled','note')),
 title text not null check (char_length(trim(title)) between 2 and 160),
 description text not null default '' check (char_length(description) <= 2000),
 visible_to_customer boolean not null default true,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 foreign key (booking_id,workshop_id) references public.bookings(id,workshop_id) on delete cascade,
 foreign key (work_order_id,workshop_id) references public.work_orders(id,workshop_id) on delete cascade
);
create index if not exists service_tracking_events_booking_idx on public.service_tracking_events(workshop_id,booking_id,created_at);
alter table public.service_tracking_events enable row level security;
create policy "workshop members read service tracking events" on public.service_tracking_events for select to authenticated
 using (exists(select 1 from public.workshop_memberships m where m.workshop_id=service_tracking_events.workshop_id and m.user_id=auth.uid() and m.status='active'));
create policy "workshop staff add service tracking events" on public.service_tracking_events for insert to authenticated
 with check (created_by=auth.uid() and exists(select 1 from public.workshop_memberships m where m.workshop_id=service_tracking_events.workshop_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin','receptionist','technician')));
grant select,insert on public.service_tracking_events to authenticated;

create or replace function public.get_public_service_offer(p_slug text)
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, public, extensions
as $$
declare result jsonb;
begin
 select jsonb_build_object(
   'slug',o.slug,'title',o.title,'description',o.description,'basePrice',o.base_price,
   'discountType',o.discount_type,'discountValue',o.discount_value,
   'discountAmount',round(least(o.base_price,case when o.discount_type='percent' then o.base_price*o.discount_value/100 else o.discount_value end),2),
   'finalPrice',round(greatest(0,o.base_price-least(o.base_price,case when o.discount_type='percent' then o.base_price*o.discount_value/100 else o.discount_value end)),2),
   'terms',o.terms,'expiresAt',o.expires_at,'workshopName',w.name
 ) into result
 from public.service_offers o join public.workshops w on w.id=o.workshop_id
 where o.slug=p_slug and o.status='active' and w.status='active'
   and (o.starts_at is null or o.starts_at <= now())
   and (o.expires_at is null or o.expires_at > now());
 return result;
end;
$$;

create or replace function public.create_public_service_booking(
 p_offer_slug text, p_full_name text, p_phone text, p_plate_number text,
 p_make text, p_model text, p_model_year integer, p_scheduled_at timestamptz,
 p_notes text, p_tracking_token text
) returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, extensions
as $$
declare
 o public.service_offers%rowtype;
 owner_user_id uuid;
 customer_id uuid;
 vehicle_id uuid;
 booking_id uuid;
 normalized_phone text;
 normalized_plate text;
 existing_vehicle_customer uuid;
begin
 if char_length(trim(coalesce(p_full_name,''))) not between 2 and 120
   or char_length(regexp_replace(coalesce(p_phone,''),'[^0-9+]','','g')) not between 8 and 20
   or char_length(trim(coalesce(p_plate_number,''))) not between 2 and 20
   or char_length(trim(coalesce(p_make,''))) not between 1 and 60
   or char_length(trim(coalesce(p_model,''))) not between 1 and 60
   or char_length(trim(coalesce(p_tracking_token,''))) not between 32 and 200
   or p_scheduled_at < now() + interval '30 minutes'
   or p_scheduled_at > now() + interval '120 days'
   or char_length(coalesce(p_notes,'')) > 2000 then
   raise exception using errcode='22023', message='Invalid public booking details';
 end if;
 select * into o from public.service_offers
 where slug=p_offer_slug and status='active'
   and (starts_at is null or starts_at <= now())
   and (expires_at is null or expires_at > now());
 if not found then raise exception using errcode='P0002', message='Offer unavailable'; end if;
 if not exists(select 1 from public.workshops w where w.id=o.workshop_id and w.status='active') then
   raise exception using errcode='P0002', message='Workshop unavailable';
 end if;
 select m.user_id into owner_user_id from public.workshop_memberships m
 where m.workshop_id=o.workshop_id and m.role in ('owner','admin') and m.status='active'
 order by case when m.role='owner' then 0 else 1 end, m.created_at asc limit 1;
 if owner_user_id is null then raise exception using errcode='P0002', message='Workshop manager unavailable'; end if;
 normalized_phone := regexp_replace(trim(p_phone),'[^0-9+]','','g');
 normalized_plate := upper(trim(p_plate_number));
 select c.id into customer_id from public.customers c
 where c.workshop_id=o.workshop_id and c.phone=normalized_phone limit 1;
 if customer_id is null then
   insert into public.customers(workshop_id,full_name,phone,notes,created_by)
   values(o.workshop_id,trim(p_full_name),normalized_phone,'تم التسجيل عبر رابط خدمة إلكتروني',owner_user_id)
   returning id into customer_id;
 end if;
 select v.id,v.customer_id into vehicle_id,existing_vehicle_customer from public.vehicles v
 where v.workshop_id=o.workshop_id and upper(v.plate_number)=normalized_plate limit 1;
 if vehicle_id is not null and existing_vehicle_customer <> customer_id then
   raise exception using errcode='23505', message='Vehicle plate is already linked to another customer';
 end if;
 if vehicle_id is null then
   insert into public.vehicles(workshop_id,customer_id,plate_number,make,model,model_year,created_by)
   values(o.workshop_id,customer_id,normalized_plate,trim(p_make),trim(p_model),p_model_year,owner_user_id)
   returning id into vehicle_id;
 end if;
 insert into public.bookings(workshop_id,marketing_partner_id,customer_id,vehicle_id,requested_service,scheduled_at,status,notes,created_by)
 values(o.workshop_id,o.marketing_partner_id,customer_id,vehicle_id,o.title,p_scheduled_at,'pending',
   concat_ws(E'\n',nullif(trim(coalesce(p_notes,'')),''),'عرض: '||o.slug),owner_user_id)
 returning id into booking_id;
 insert into public.public_service_tracking(workshop_id,booking_id,token_hash)
 values(o.workshop_id,booking_id,encode(digest(p_tracking_token,'sha256'),'hex'));
 insert into public.service_tracking_events(workshop_id,booking_id,event_type,title,description,visible_to_customer,created_by)
 values(o.workshop_id,booking_id,'booking_created','تم استلام طلب الحجز',
   'وصل طلبك للورشة وسيتم التواصل معك لتأكيد الموعد. السعر المعروض تقديري حتى فحص السيارة.',true,owner_user_id);
 return jsonb_build_object('bookingId',booking_id,'scheduledAt',p_scheduled_at,'status','pending');
end;
$$;

create or replace function public.get_public_service_tracking(p_tracking_token text)
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, public, extensions
as $$
declare result jsonb;
begin
 if char_length(coalesce(p_tracking_token,'')) not between 32 and 200 then return null; end if;
 select jsonb_build_object(
  'bookingId',b.id,'service',b.requested_service,'scheduledAt',b.scheduled_at,'bookingStatus',b.status,
  'vehicle',jsonb_build_object('make',v.make,'model',v.model,'plateNumber',v.plate_number,'year',v.model_year),
  'workOrderStatus',wo.status,
  'events',coalesce((select jsonb_agg(jsonb_build_object('type',e.event_type,'title',e.title,'description',e.description,'createdAt',e.created_at) order by e.created_at asc)
    from public.service_tracking_events e where e.booking_id=b.id and e.workshop_id=b.workshop_id and e.visible_to_customer), '[]'::jsonb)
 ) into result
 from public.public_service_tracking t
 join public.bookings b on b.id=t.booking_id and b.workshop_id=t.workshop_id
 left join public.vehicles v on v.id=b.vehicle_id and v.workshop_id=b.workshop_id
 left join public.work_orders wo on wo.booking_id=b.id and wo.workshop_id=b.workshop_id
 where t.token_hash=encode(digest(p_tracking_token,'sha256'),'hex');
 return result;
end;
$$;

create or replace function public.record_work_order_tracking_event()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, extensions
as $$
declare event_kind text; event_title text; event_description text;
begin
 if tg_op='INSERT' then
   event_kind := 'vehicle_received'; event_title := 'تم استقبال السيارة';
   event_description := 'تم فتح أمر العمل وبدء متابعة حالة السيارة إلكترونيًا.';
 elsif new.status is distinct from old.status then
   case new.status
    when 'diagnosing' then event_kind := 'diagnosing'; event_title := 'قيد التشخيص'; event_description := 'يعمل الفريق على فحص السيارة وتحديد سبب العطل.';
    when 'waiting_parts' then event_kind := 'waiting_parts'; event_title := 'بانتظار قطع الغيار'; event_description := 'تم تسجيل انتظار قطعة غيار قبل استكمال العمل.';
    when 'in_progress' then event_kind := 'repairing'; event_title := 'قيد الإصلاح'; event_description := 'بدأ تنفيذ أعمال الإصلاح المسجلة.';
    when 'completed' then event_kind := 'quality_check'; event_title := 'اكتمل الإصلاح'; event_description := 'تم تسجيل اكتمال أمر العمل. يرجى مراجعة الورشة لخطوة التسليم.';
    when 'cancelled' then event_kind := 'cancelled'; event_title := 'توقف العمل'; event_description := 'تم إيقاف أمر العمل. تواصل مع الورشة للتفاصيل.';
    else return new;
   end case;
 else
   return new;
 end if;
 insert into public.service_tracking_events(workshop_id,booking_id,work_order_id,event_type,title,description,visible_to_customer,created_by)
 values(new.workshop_id,new.booking_id,new.id,event_kind,event_title,event_description,true,
   case when auth.uid() is not null then auth.uid() else new.created_by end);
 if new.status='completed' then
   insert into public.service_tracking_events(workshop_id,booking_id,work_order_id,event_type,title,description,visible_to_customer,created_by)
   values(new.workshop_id,new.booking_id,new.id,'completed','السيارة جاهزة للتسليم',
     'أُغلق أمر العمل في النظام. يتم تأكيد التسليم النهائي من فريق الورشة.',true,
     case when auth.uid() is not null then auth.uid() else new.created_by end);
 end if;
 return new;
end;
$$;
drop trigger if exists work_order_tracking_events on public.work_orders;
create trigger work_order_tracking_events
after insert or update of status on public.work_orders
for each row execute function public.record_work_order_tracking_event();

revoke all on function public.get_public_service_offer(text) from public;
revoke all on function public.create_public_service_booking(text,text,text,text,text,text,integer,timestamptz,text,text) from public;
revoke all on function public.get_public_service_tracking(text) from public;
grant execute on function public.get_public_service_offer(text) to anon, authenticated;
grant execute on function public.create_public_service_booking(text,text,text,text,text,text,integer,timestamptz,text,text) to anon, authenticated;
grant execute on function public.get_public_service_tracking(text) to anon, authenticated;


-- Public catalog for the services landing page. It intentionally exposes only published offer fields.
create or replace function public.get_public_service_offers()
returns jsonb language sql stable security definer
set search_path = pg_catalog, public, extensions
as $$
 select coalesce(jsonb_agg(jsonb_build_object(
   'slug',o.slug,'title',o.title,'description',o.description,'basePrice',o.base_price,
   'discountType',o.discount_type,'discountValue',o.discount_value,
   'discountAmount',round(least(o.base_price,case when o.discount_type='percent' then o.base_price*o.discount_value/100 else o.discount_value end),2),
   'finalPrice',round(greatest(0,o.base_price-least(o.base_price,case when o.discount_type='percent' then o.base_price*o.discount_value/100 else o.discount_value end)),2),
   'terms',o.terms,'expiresAt',o.expires_at,'workshopName',w.name
 ) order by o.created_at desc), '[]'::jsonb)
 from public.service_offers o join public.workshops w on w.id=o.workshop_id
 where o.status='active' and w.status='active'
   and (o.starts_at is null or o.starts_at <= now())
   and (o.expires_at is null or o.expires_at > now());
$$;

create or replace function public.record_booking_tracking_event()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, extensions
as $$
begin
 if new.status='confirmed' and new.status is distinct from old.status then
   insert into public.service_tracking_events(workshop_id,booking_id,event_type,title,description,visible_to_customer,created_by)
   values(new.workshop_id,new.id,'booking_confirmed','تم تأكيد موعدك',
     'أكدت الورشة موعد الحجز. ستظهر هنا تحديثات السيارة بعد استقبالها.',true,
     case when auth.uid() is not null then auth.uid() else new.created_by end);
 end if;
 return new;
end;
$$;
drop trigger if exists booking_tracking_confirmation on public.bookings;
create trigger booking_tracking_confirmation
after update of status on public.bookings
for each row execute function public.record_booking_tracking_event();

revoke all on function public.get_public_service_offers() from public;
grant execute on function public.get_public_service_offers() to anon, authenticated;
