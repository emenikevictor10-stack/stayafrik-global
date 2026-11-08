ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS weekend_price numeric,
  ADD COLUMN IF NOT EXISTS cleaning_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_discount_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_discount_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_nights integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_nights integer,
  ADD COLUMN IF NOT EXISTS booking_mode text NOT NULL DEFAULT 'instant',
  ADD COLUMN IF NOT EXISTS ical_url text,
  ADD COLUMN IF NOT EXISTS ical_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS ical_error text;
ALTER TABLE public.listings ADD CONSTRAINT listings_booking_mode_chk CHECK (booking_mode IN ('instant','request'));
ALTER TABLE public.listings ADD CONSTRAINT listings_discounts_chk CHECK (weekly_discount_pct BETWEEN 0 AND 90 AND monthly_discount_pct BETWEEN 0 AND 90 AND cleaning_fee >= 0 AND min_nights >= 1 AND (max_nights IS NULL OR max_nights >= min_nights));

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS host_respond_by timestamptz, ADD COLUMN IF NOT EXISTS cleaning_fee_kobo bigint, ADD COLUMN IF NOT EXISTS discount_kobo bigint;

CREATE TABLE public.listing_date_prices (
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  date date NOT NULL,
  price numeric NOT NULL CHECK (price > 0),
  PRIMARY KEY (listing_id, date)
);
GRANT SELECT ON public.listing_date_prices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_date_prices TO authenticated;
GRANT ALL ON public.listing_date_prices TO service_role;
ALTER TABLE public.listing_date_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads date prices" ON public.listing_date_prices FOR SELECT USING (true);
CREATE POLICY "Hosts manage own date prices" ON public.listing_date_prices FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.host_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.host_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.listing_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  source text NOT NULL DEFAULT 'host' CHECK (source IN ('host','ical')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date > start_date)
);
CREATE INDEX listing_blocks_listing_idx ON public.listing_blocks(listing_id, end_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_blocks TO authenticated;
GRANT ALL ON public.listing_blocks TO service_role;
ALTER TABLE public.listing_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts manage own blocks" ON public.listing_blocks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.host_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (source = 'host' AND (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.host_id = auth.uid()) OR public.has_role(auth.uid(),'admin')));

CREATE POLICY "Hosts view bookings for their stays" ON public.bookings FOR SELECT TO authenticated USING (host_id = auth.uid());

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
DO $$ DECLARE c text; BEGIN
  SELECT conname INTO c FROM pg_constraint WHERE conrelid='public.bookings'::regclass AND contype='c' AND pg_get_constraintdef(oid) ILIKE '%needs_attention%';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE public.bookings DROP CONSTRAINT %I', c); END IF;
END $$;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('held','processing','awaiting_host','confirmed','released','completed','expired','declined','cancelled','refunded','needs_attention','failed','pending'));

ALTER TABLE public.bookings DROP CONSTRAINT bookings_no_overlap;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_no_overlap EXCLUDE USING gist (listing_id WITH =, daterange(check_in_date, check_out_date) WITH &&)
  WHERE (listing_id IS NOT NULL AND status IN ('held','awaiting_host','confirmed','released','needs_attention'));

CREATE OR REPLACE FUNCTION public.booking_status_guard() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE ok boolean;
BEGIN
  IF NEW.status = OLD.status OR NEW.source = 'rayprop' THEN RETURN NEW; END IF;
  ok := CASE OLD.status
    WHEN 'pending' THEN NEW.status IN ('held','confirmed','cancelled','expired')
    WHEN 'held' THEN NEW.status IN ('confirmed','awaiting_host','expired','cancelled','needs_attention')
    WHEN 'expired' THEN NEW.status IN ('confirmed','awaiting_host','needs_attention')
    WHEN 'processing' THEN NEW.status IN ('confirmed','needs_attention','cancelled')
    WHEN 'awaiting_host' THEN NEW.status IN ('confirmed','declined','cancelled','needs_attention')
    WHEN 'confirmed' THEN NEW.status IN ('released','completed','cancelled','refunded','needs_attention','declined')
    WHEN 'released' THEN NEW.status IN ('completed','cancelled','refunded')
    WHEN 'completed' THEN NEW.status IN ('refunded')
    WHEN 'needs_attention' THEN NEW.status IN ('confirmed','cancelled','refunded')
    WHEN 'cancelled' THEN NEW.status IN ('refunded')
    WHEN 'declined' THEN NEW.status IN ('refunded')
    ELSE false END;
  IF NOT ok THEN RAISE EXCEPTION 'Booking cannot move from % to %', OLD.status, NEW.status USING ERRCODE = 'check_violation'; END IF;
  IF NEW.status = 'confirmed' AND NEW.confirmed_at IS NULL THEN NEW.confirmed_at := now(); END IF;
  IF NEW.status IN ('cancelled','declined') AND NEW.cancelled_at IS NULL THEN NEW.cancelled_at := now(); END IF;
  IF NEW.status = 'released' AND NEW.released_at IS NULL THEN NEW.released_at := now(); END IF;
  IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN NEW.completed_at := now(); END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.confirm_local_payment(_reference text, _amount_kobo bigint) RETURNS bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE b public.bookings; _mode text; _next text;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE payment_reference = _reference FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No booking for this payment' USING ERRCODE = 'no_data_found'; END IF;
  IF b.status NOT IN ('held','expired','pending') THEN RETURN b; END IF;
  PERFORM set_config('app.actor', 'system', true);
  PERFORM public.log_booking_event(b.id, 'payment_received', 'system', jsonb_build_object('amount_kobo', _amount_kobo, 'reference', _reference));
  IF round(b.total_price * 100) <> _amount_kobo THEN
    UPDATE public.bookings SET status = 'needs_attention', paid_at = now(),
      attention_reason = format('Paid %s kobo, expected %s', _amount_kobo, round(b.total_price * 100))
      WHERE id = b.id RETURNING * INTO b;
    PERFORM public.notify_admins('Booking payment mismatch', b.attention_reason, '/admin/bookings');
    RETURN b;
  END IF;
  SELECT booking_mode INTO _mode FROM public.listings WHERE id = b.listing_id;
  _next := CASE WHEN _mode = 'request' THEN 'awaiting_host' ELSE 'confirmed' END;
  BEGIN
    UPDATE public.bookings SET status = _next, paid_at = now(),
      host_respond_by = CASE WHEN _next = 'awaiting_host' THEN now() + make_interval(hours => public.setting_int('host_accept_hours', 24)) END
      WHERE id = b.id RETURNING * INTO b;
    IF _next = 'awaiting_host' AND b.host_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (b.host_id, 'booking_request', 'New booking request', 'A guest has paid and is waiting for you to accept. Reply within ' || public.setting_int('host_accept_hours', 24) || ' hours.', '/agent/escrow');
    END IF;
  EXCEPTION WHEN exclusion_violation THEN
    UPDATE public.bookings SET status = 'needs_attention', paid_at = now(),
      attention_reason = 'Paid after the hold expired and the nights were taken'
      WHERE id = b.id RETURNING * INTO b;
    PERFORM public.notify_admins('Paid booking needs attention', 'Guest paid after their hold expired and the nights were taken. Refund or move them.', '/admin/bookings');
  END;
  RETURN b;
END $function$;

CREATE OR REPLACE FUNCTION public.host_booking_action(_booking_id uuid, _action text, _reason text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE b public.bookings;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF b.host_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF b.status <> 'awaiting_host' THEN RAISE EXCEPTION 'This request has already been answered'; END IF;
  PERFORM set_config('app.actor', CASE WHEN public.has_role(auth.uid(),'admin') THEN 'staff' ELSE 'host' END, true);
  IF _action = 'accept' THEN
    UPDATE public.bookings SET status = 'confirmed' WHERE id = b.id;
    INSERT INTO public.notifications(user_id, type, title, body, link) VALUES (b.guest_id, 'booking_confirmed', 'Your booking is confirmed', 'The host accepted your request.', '/bookings');
  ELSIF _action = 'decline' THEN
    UPDATE public.bookings SET status = 'declined', attention_reason = left(coalesce(_reason,'Host declined'), 300) WHERE id = b.id;
    INSERT INTO public.notifications(user_id, type, title, body, link) VALUES (b.guest_id, 'booking_declined', 'Booking request declined', 'The host could not accept. Your full payment is being refunded.', '/bookings');
  ELSE RAISE EXCEPTION 'Unknown action'; END IF;
END $function$;
REVOKE ALL ON FUNCTION public.host_booking_action(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.host_booking_action(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.booking_lifecycle_tick() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _exp int; _rel int; _done int; _timeout int; _delay int := public.setting_int('payout_delay_days', 1);
BEGIN
  PERFORM set_config('app.actor', 'system', true);
  WITH u AS (UPDATE public.bookings SET status = 'expired'
    WHERE status = 'held' AND hold_expires_at < now() RETURNING 1) SELECT count(*) INTO _exp FROM u;
  WITH u AS (UPDATE public.bookings SET status = 'declined', attention_reason = 'Host did not reply in time'
    WHERE status = 'awaiting_host' AND host_respond_by < now() RETURNING guest_id),
    n AS (INSERT INTO public.notifications(user_id, type, title, body, link)
      SELECT guest_id, 'booking_declined', 'Booking request expired', 'The host did not reply in time. Your full payment is being refunded.', '/bookings' FROM u RETURNING 1)
    SELECT count(*) INTO _timeout FROM n;
  WITH u AS (UPDATE public.bookings SET status = 'released'
    WHERE status = 'confirmed' AND source <> 'rayprop' AND check_in_date + _delay <= current_date RETURNING 1) SELECT count(*) INTO _rel FROM u;
  WITH u AS (UPDATE public.bookings SET status = 'completed'
    WHERE (status = 'released' OR (status = 'confirmed' AND source = 'rayprop')) AND check_out_date < current_date RETURNING 1) SELECT count(*) INTO _done FROM u;
  RETURN jsonb_build_object('expired', _exp, 'request_timeouts', _timeout, 'released', _rel, 'completed', _done);
END $function$;

CREATE OR REPLACE FUNCTION public.listing_booked_ranges(_listing_id uuid) RETURNS TABLE(check_in date, check_out date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT * FROM (
    SELECT b.check_in_date, b.check_out_date FROM public.bookings b
    WHERE b.listing_id = _listing_id
      AND (b.status IN ('awaiting_host','confirmed','released','needs_attention') OR (b.status = 'held' AND b.hold_expires_at > now()))
      AND b.check_out_date >= CURRENT_DATE
    UNION ALL
    SELECT k.start_date, k.end_date FROM public.listing_blocks k
    WHERE k.listing_id = _listing_id AND k.end_date >= CURRENT_DATE
  ) r ORDER BY 1;
$function$;