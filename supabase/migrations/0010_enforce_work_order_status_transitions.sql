-- Enforce work-order status transitions and synchronize terminal outcomes to the linked booking.
-- Booking terminal states must match the terminal state of an existing work order.

create or replace function public.enforce_booking_status_transition()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  related_work_order_status text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status = 'pending' and new.status = 'confirmed' then
    return new;
  end if;

  if old.status in ('pending', 'confirmed') and new.status = 'cancelled' then
    select wo.status into related_work_order_status
    from public.work_orders wo
    where wo.booking_id = old.id and wo.workshop_id = old.workshop_id;

    if not found or related_work_order_status = 'cancelled' then
      return new;
    end if;

    raise exception using errcode = '23514',
      message = 'Cancel the linked work order before cancelling its booking';
  end if;

  if old.status in ('pending', 'confirmed') and new.status = 'in_progress' then
    select wo.status into related_work_order_status
    from public.work_orders wo
    where wo.booking_id = old.id and wo.workshop_id = old.workshop_id;

    if found and related_work_order_status not in ('completed', 'cancelled') then
      return new;
    end if;

    raise exception using errcode = '23514',
      message = 'A booking cannot enter in_progress without a non-terminal work order';
  end if;

  if old.status = 'in_progress' and new.status in ('completed', 'cancelled') then
    select wo.status into related_work_order_status
    from public.work_orders wo
    where wo.booking_id = old.id and wo.workshop_id = old.workshop_id;

    if found and related_work_order_status = new.status then
      return new;
    end if;

    raise exception using errcode = '23514',
      message = 'A booking can only become terminal when its linked work order has the same status';
  end if;

  raise exception using errcode = '23514',
    message = format('Invalid booking status transition: %s -> %s', old.status, new.status);
end;
$$;

create or replace function public.enforce_work_order_status_transition()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status = 'open' and new.status in ('diagnosing', 'cancelled') then
    return new;
  end if;

  if old.status = 'diagnosing' and new.status in ('waiting_parts', 'in_progress', 'cancelled') then
    return new;
  end if;

  if old.status = 'waiting_parts' and new.status in ('diagnosing', 'in_progress', 'cancelled') then
    return new;
  end if;

  if old.status = 'in_progress' and new.status in ('waiting_parts', 'completed', 'cancelled') then
    return new;
  end if;

  raise exception using errcode = '23514',
    message = format('Invalid work-order status transition: %s -> %s', old.status, new.status);
end;
$$;

create or replace function public.sync_booking_status_from_work_order()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  booking_status text;
begin
  if new.status is not distinct from old.status
     or new.status not in ('completed', 'cancelled') then
    return new;
  end if;

  select b.status into booking_status
  from public.bookings b
  where b.id = new.booking_id and b.workshop_id = new.workshop_id
  for update;

  if not found then
    raise exception using errcode = '23503',
      message = 'The work order has no matching booking in its workshop';
  end if;

  if booking_status = new.status then
    return new;
  end if;

  if booking_status <> 'in_progress' then
    raise exception using errcode = '23514',
      message = 'The linked booking must be in_progress before the work order can become terminal';
  end if;

  update public.bookings
  set status = new.status, updated_at = now()
  where id = new.booking_id and workshop_id = new.workshop_id and status = 'in_progress';

  if not found then
    raise exception using errcode = '23514',
      message = 'The linked booking status changed concurrently';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_work_order_status_transition on public.work_orders;
create trigger enforce_work_order_status_transition
before update of status on public.work_orders
for each row
execute function public.enforce_work_order_status_transition();

drop trigger if exists sync_booking_status_from_work_order on public.work_orders;
create trigger sync_booking_status_from_work_order
after update of status on public.work_orders
for each row
execute function public.sync_booking_status_from_work_order();
