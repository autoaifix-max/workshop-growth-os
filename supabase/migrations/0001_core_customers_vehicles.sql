-- First multi-tenant operational slice. Uses Supabase Auth and user-scoped API sessions.
create extension if not exists pgcrypto;
create table if not exists public.workshops (
 id uuid primary key default gen_random_uuid(),
 name text not null check(char_length(trim(name)) between 2 and 160),
 slug text not null unique check(slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
 status text not null default 'active' check(status in ('active','suspended','closed')),
 created_at timestamptz not null default now()
);
create table if not exists public.workshop_memberships (
 id uuid primary key default gen_random_uuid(),
 workshop_id uuid not null references public.workshops(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','admin','receptionist','technician')),
 status text not null default 'active' check(status in ('active','invited','suspended')),
 created_at timestamptz not null default now(),
 unique(workshop_id,user_id)
);
create index if not exists memberships_user_status_idx on public.workshop_memberships(user_id,status);
create table if not exists public.customers (
 id uuid primary key default gen_random_uuid(),
 workshop_id uuid not null references public.workshops(id) on delete cascade,
 full_name text not null check(char_length(trim(full_name)) between 2 and 120),
 phone text not null check(char_length(trim(phone)) between 8 and 20),
 notes text not null default '' check(char_length(notes)<=2000),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(workshop_id,phone),
 unique(id,workshop_id)
);
create index if not exists customers_workshop_created_idx on public.customers(workshop_id,created_at desc);
create table if not exists public.vehicles (
 id uuid primary key default gen_random_uuid(),
 workshop_id uuid not null references public.workshops(id) on delete cascade,
 customer_id uuid not null,
 plate_number text not null check(char_length(trim(plate_number)) between 2 and 20),
 make text not null check(char_length(trim(make)) between 1 and 60),
 model text not null check(char_length(trim(model)) between 1 and 60),
 model_year integer check(model_year between 1950 and 2100),
 vin text check(vin is null or char_length(trim(vin)) between 5 and 40),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(customer_id,workshop_id) references public.customers(id,workshop_id) on delete cascade,
 unique(workshop_id,plate_number),
 unique(workshop_id,vin)
);
create index if not exists vehicles_workshop_customer_idx on public.vehicles(workshop_id,customer_id);
alter table public.workshops enable row level security;
alter table public.workshop_memberships enable row level security;
alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
create policy "members read own workshops" on public.workshops for select to authenticated
 using(exists(select 1 from public.workshop_memberships m where m.workshop_id=workshops.id and m.user_id=auth.uid() and m.status='active'));
create policy "users read own memberships" on public.workshop_memberships for select to authenticated using(user_id=auth.uid());
create policy "members read customers" on public.customers for select to authenticated
 using(exists(select 1 from public.workshop_memberships m where m.workshop_id=customers.workshop_id and m.user_id=auth.uid() and m.status='active'));
create policy "staff create customers" on public.customers for insert to authenticated with check(
 created_by=auth.uid() and exists(select 1 from public.workshop_memberships m where m.workshop_id=customers.workshop_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin','receptionist')));
create policy "members read vehicles" on public.vehicles for select to authenticated
 using(exists(select 1 from public.workshop_memberships m where m.workshop_id=vehicles.workshop_id and m.user_id=auth.uid() and m.status='active'));
create policy "staff create vehicles" on public.vehicles for insert to authenticated with check(
 created_by=auth.uid() and exists(select 1 from public.workshop_memberships m where m.workshop_id=vehicles.workshop_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin','receptionist','technician')));
grant usage on schema public to authenticated;
grant select on public.workshops,public.workshop_memberships,public.customers,public.vehicles to authenticated;
grant insert on public.customers,public.vehicles to authenticated;
comment on table public.workshops is 'Tenant boundary for Workshop Growth OS.';
comment on table public.vehicles is 'Composite foreign key prevents cross-workshop customer links.';
