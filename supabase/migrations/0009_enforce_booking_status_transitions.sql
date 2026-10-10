-- Enforce booking status transitions even when callers bypass the application API.
-- Moving a booking into in_progress is reserved for the work-order conversion flow.
-- That transition is permitted only after the work order exists for the same booking/workshop.

create or replace function public.enforce_booking_status_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status = 'pending' and new.status in ('confirmed', 'cancelled') then
    return new;
  end if;

  if old.status = 'confirmed' and new.status = 'cancelled' then
    return new;
  end if;

  if old.status = 'in_progress' and new.status in ('completed', 'cancelled') then
    return new;
  end if;

  if old.status in ('pending', 'confirmed') and new.status = 'in_progress' then
    if exists (
      select 1
      from public.work_orders wo
      where wo.booking_id = old.id
        and wo.workshop_id = old.workshop_id
    ) then
      return new;
    end if;

    raise exception using
      errcode = '23514',
      message = 'A booking cannot enter in_progress before its work order exists';
  end if;

  raise exception using
    errcode = '23514',
    message = format('Invalid booking status transition: %s -> %s', old.status, new.status);
end;
$$;

drop trigger if exists enforce_booking_status_transition on public.bookings;
create trigger enforce_booking_status_transition
before update of status on public.bookings
for each row
execute function public.enforce_booking_status_transition();
