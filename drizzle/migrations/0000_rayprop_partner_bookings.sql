ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS partner_title text,
  ADD COLUMN IF NOT EXISTS partner_image text,
  ADD COLUMN IF NOT EXISTS partner_city text,
  ADD COLUMN IF NOT EXISTS rayprop_quote_total_kobo bigint,
  ADD COLUMN IF NOT EXISTS rayprop_hold_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS guest_count integer,
  ADD COLUMN IF NOT EXISTS attention_reason text;

CREATE TABLE IF NOT EXISTS public.rayprop_events (
  event_id text PRIMARY KEY,
  event_type text,
  reservation_id text,
  payload jsonb,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rayprop_events TO authenticated;
GRANT ALL ON public.rayprop_events TO service_role;
ALTER TABLE public.rayprop_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read partner events" ON public.rayprop_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.notify_on_booking()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _host uuid; _title text;
BEGIN
  IF NEW.listing_id IS NULL THEN RETURN NEW; END IF;
  SELECT host_id, title INTO _host, _title FROM public.listings WHERE id = NEW.listing_id;
  IF _host IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (_host, 'booking', 'New booking request', 'A guest booked: ' || COALESCE(_title,'your listing'), '/escrow');
    PERFORM public.send_alert_email(_host, 'New booking on StayGlobal', 'You have a new booking',
      'A guest just booked <strong>' || COALESCE(_title,'your listing') || '</strong>. Come online to confirm the details and chat with your guest.', '/escrow');
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.auto_release_due_bookings()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _count integer;
BEGIN
  WITH upd AS (
    UPDATE public.bookings SET status = 'released', released_at = now()
    WHERE status = 'confirmed' AND source <> 'rayprop'
      AND check_out_date < (current_date - INTERVAL '1 day')
    RETURNING 1)
  SELECT count(*) INTO _count FROM upd;
  RETURN _count;
END; $function$;