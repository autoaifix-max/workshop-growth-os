-- The booking synchronization routine is a trigger-only SECURITY DEFINER function.
-- Do not expose it as an invokable PostgREST RPC to anonymous or signed-in clients.
revoke execute on function public.sync_booking_status_from_work_order() from public;
revoke execute on function public.sync_booking_status_from_work_order() from anon;
revoke execute on function public.sync_booking_status_from_work_order() from authenticated;
