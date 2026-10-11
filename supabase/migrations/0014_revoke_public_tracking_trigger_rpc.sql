-- Trigger-only SECURITY DEFINER functions must not be callable as PostgREST RPCs.
-- Trigger execution remains functional after revoking direct EXECUTE privileges.
revoke all on function public.record_booking_tracking_event() from public, anon, authenticated;
revoke all on function public.record_work_order_tracking_event() from public, anon, authenticated;
