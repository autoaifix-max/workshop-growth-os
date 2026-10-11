-- Influencer / creator affiliate tracking and commission ledger.
-- All records remain tenant-scoped; only workshop owners/admins manage marketing.
create table if not exists public.marketing_partners (
 id uuid primary key default gen_random_uuid(),
 workshop_id uuid not null references public.workshops(id) on delete cascade,
 name text not null check (char_length(trim(name)) between 2 and 120),
 platform text not null default 'other' check (platform in ('tiktok','instagram','snapchat','youtube','x','other')),
 handle text not null default '' check (char_length(handle) <= 160),
 contact text not null default '' check (char_length(contact) <= 160),
 referral_code text not null check (referral_code ~ '^[A-Z0-9_-]{3,32}$'),
 commission_type text not null check (commission_type in ('fixed','percent')),
 commission_value numeric(12,2) not null check (commission_value > 0 and (commission_type <> 'percent' or commission_value <= 100)),
 status text not null default 'active' check (status in ('active','inactive')),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(workshop_id, referral_code),
 unique(id, workshop_id)
);
create index if not exists marketing_partners_workshop_status_idx on public.marketing_partners(workshop_id,status);

alter table public.bookings add column if not exists marketing_partner_id uuid;
alter table public.bookings add constraint bookings_marketing_partner_workshop_fk
 foreign key (marketing_partner_id, workshop_id)
 references public.marketing_partners(id, workshop_id) on delete restrict;
create index if not exists bookings_workshop_partner_idx on public.bookings(workshop_id,marketing_partner_id,created_at desc);

create unique index if not exists work_orders_id_workshop_unique on public.work_orders(id, workshop_id);

create table if not exists public.marketing_commissions (
 id uuid primary key default gen_random_uuid(),
 workshop_id uuid not null references public.workshops(id) on delete cascade,
 partner_id uuid not null,
 work_order_id uuid not null,
 collected_amount numeric(12,2) not null check (collected_amount > 0),
 commission_amount numeric(12,2) not null check (commission_amount > 0),
 status text not null default 'pending_review' check (status in ('pending_review','approved','paid','cancelled')),
 payment_reference text not null default '' check (char_length(payment_reference) <= 160),
 notes text not null default '' check (char_length(notes) <= 1000),
 recorded_by uuid not null references auth.users(id),
 paid_at timestamptz,
 paid_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key (partner_id, workshop_id) references public.marketing_partners(id, workshop_id) on delete restrict,
 foreign key (work_order_id, workshop_id) references public.work_orders(id, workshop_id) on delete restrict,
 unique(work_order_id)
);
create index if not exists marketing_commissions_workshop_status_idx on public.marketing_commissions(workshop_id,status,created_at desc);

alter table public.marketing_partners enable row level security;
alter table public.marketing_commissions enable row level security;
create policy "workshop managers read marketing partners" on public.marketing_partners for select to authenticated
 using (exists(select 1 from public.workshop_memberships m where m.workshop_id=marketing_partners.workshop_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin')));
create policy "workshop managers insert marketing partners" on public.marketing_partners for insert to authenticated
 with check (created_by=auth.uid() and exists(select 1 from public.workshop_memberships m where m.workshop_id=marketing_partners.workshop_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin')));
create policy "workshop managers update marketing partners" on public.marketing_partners for update to authenticated
 using (exists(select 1 from public.workshop_memberships m where m.workshop_id=marketing_partners.workshop_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin')))
 with check (exists(select 1 from public.workshop_memberships m where m.workshop_id=marketing_partners.workshop_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin')));
create policy "workshop managers read commissions" on public.marketing_commissions for select to authenticated
 using (exists(select 1 from public.workshop_memberships m where m.workshop_id=marketing_commissions.workshop_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin')));
create policy "workshop managers insert commissions" on public.marketing_commissions for insert to authenticated
 with check (recorded_by=auth.uid() and exists(select 1 from public.workshop_memberships m where m.workshop_id=marketing_commissions.workshop_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin')));
create policy "workshop managers update commissions" on public.marketing_commissions for update to authenticated
 using (exists(select 1 from public.workshop_memberships m where m.workshop_id=marketing_commissions.workshop_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin')))
 with check (exists(select 1 from public.workshop_memberships m where m.workshop_id=marketing_commissions.workshop_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin')));
grant select, insert, update on public.marketing_partners, public.marketing_commissions to authenticated;

-- Minimal referral-code index: workshop staff can resolve codes without seeing partner contact details.
create table if not exists public.marketing_referral_codes (
 id uuid primary key default gen_random_uuid(),
 workshop_id uuid not null,
 partner_id uuid not null,
 referral_code text not null,
 status text not null default 'active' check (status in ('active','inactive')),
 created_at timestamptz not null default now(),
 foreign key (partner_id, workshop_id) references public.marketing_partners(id, workshop_id) on delete cascade,
 unique(workshop_id, referral_code),
 unique(partner_id)
);
create index if not exists marketing_referral_codes_lookup_idx on public.marketing_referral_codes(workshop_id, referral_code, status);
alter table public.marketing_referral_codes enable row level security;
create policy "members resolve referral codes" on public.marketing_referral_codes for select to authenticated
 using (status='active' and exists(select 1 from public.workshop_memberships m join public.workshops w on w.id=m.workshop_id where m.workshop_id=marketing_referral_codes.workshop_id and m.user_id=auth.uid() and m.status='active' and w.status='active'));
create policy "managers add referral codes" on public.marketing_referral_codes for insert to authenticated
 with check (exists(select 1 from public.workshop_memberships m where m.workshop_id=marketing_referral_codes.workshop_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin')));
grant select, insert on public.marketing_referral_codes to authenticated;

