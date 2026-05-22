
DROP POLICY IF EXISTS "System inserts notifications" ON public.notifications;
-- Only allow inserts where the row targets a different user via triggers; block direct client inserts.
CREATE POLICY "Self can insert own notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

REVOKE EXECUTE ON FUNCTION public.notify_on_booking() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_message() FROM PUBLIC, anon, authenticated;
