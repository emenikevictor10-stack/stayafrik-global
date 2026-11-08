CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS hold_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS nightly_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS subtotal_kobo bigint,
  ADD COLUMN IF NOT EXISTS fee_kobo bigint,
  ADD COLUMN IF NOT EXISTS markup_kobo bigint,
  ADD COLUMN IF NOT EXISTS host_payout_kobo bigint,
  ADD COLUMN IF NOT EXISTS host_id uuid;

ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check CHECK (status IN
  ('held','processing','confirmed','released','completed','expired','declined','cancelled','refunded','needs_attention','failed','pending')) NOT VALID;

ALTER TABLE public.bookings ADD CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
  listing_id WITH =, daterange(check_in_date, check_out_date) WITH &&
) WHERE (listing_id IS NOT NULL AND status IN ('held','confirmed','released','needs_attention'));

-- Timeline
CREATE TABLE public.booking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  type text NOT NULL,
  actor text NOT NULL DEFAULT 'system' CHECK (actor IN ('guest','staff','system','rayprop','host')),
  actor_id uuid,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX booking_events_booking_idx ON public.booking_events(booking_id, created_at);
GRANT SELECT ON public.booking_events TO authenticated;
GRANT ALL ON public.booking_events TO service_role;
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read booking events" ON public.booking_events FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Guests read own booking events" ON public.booking_events FOR SELECT TO authenticated
  USING (type <> 'note' AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.guest_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.log_booking_event(_booking_id uuid, _type text, _actor text, _data jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.booking_events (booking_id, type, actor, actor_id, data)
  VALUES (_booking_id, _type, _actor, auth.uid(), coalesce(_data, '{}'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.log_booking_event(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_booking_event(uuid, text, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.booking_actor() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(nullif(current_setting('app.actor', true), ''),
    CASE WHEN auth.uid() IS NULL THEN 'system'
         WHEN private.has_role(auth.uid(), 'admin'::app_role) THEN 'staff'
         ELSE 'guest' END);
$$;

-- Allowed moves (mirror of _shared/booking-core.ts ALLOWED_MOVES); partner stays follow RayProp so are not guarded.
CREATE OR REPLACE FUNCTION public.booking_status_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE ok boolean;
BEGIN
  IF NEW.status = OLD.status OR NEW.source = 'rayprop' THEN RETURN NEW; END IF;
  ok := CASE OLD.status
    WHEN 'pending' THEN NEW.status IN ('held','confirmed','cancelled','expired')
    WHEN 'held' THEN NEW.status IN ('confirmed','expired','cancelled','needs_attention')
    WHEN 'expired' THEN NEW.status IN ('confirmed','needs_attention')
    WHEN 'processing' THEN NEW.status IN ('confirmed','needs_attention','cancelled')
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
END $$;
CREATE TRIGGER trg_booking_status_guard BEFORE UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.booking_status_guard();

CREATE OR REPLACE FUNCTION public.booking_status_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_booking_event(NEW.id, 'status:' || NEW.status, public.booking_actor(),
      jsonb_build_object('total', NEW.total_price, 'reference', NEW.payment_reference, 'hold_expires_at', NEW.hold_expires_at));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.log_booking_event(NEW.id, 'status:' || NEW.status, public.booking_actor(),
      jsonb_build_object('from', OLD.status, 'reason', NEW.attention_reason));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_booking_status_event AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.booking_status_event();

-- Payment confirmation for local stays (service role only)
CREATE OR REPLACE FUNCTION public.confirm_local_payment(_reference text, _amount_kobo bigint)
RETURNS public.bookings LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.bookings;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE payment_reference = _reference FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No booking for this payment' USING ERRCODE = 'no_data_found'; END IF;
  IF b.status NOT IN ('held','expired','pending') THEN RETURN b; END IF; -- already handled
  PERFORM set_config('app.actor', 'system', true);
  PERFORM public.log_booking_event(b.id, 'payment_received', 'system', jsonb_build_object('amount_kobo', _amount_kobo, 'reference', _reference));
  IF round(b.total_price * 100) <> _amount_kobo THEN
    UPDATE public.bookings SET status = 'needs_attention', paid_at = now(),
      attention_reason = format('Paid %s kobo, expected %s', _amount_kobo, round(b.total_price * 100))
      WHERE id = b.id RETURNING * INTO b;
    PERFORM public.notify_admins('Booking payment mismatch', b.attention_reason, '/admin/bookings');
    RETURN b;
  END IF;
  BEGIN
    UPDATE public.bookings SET status = 'confirmed', paid_at = now() WHERE id = b.id RETURNING * INTO b;
  EXCEPTION WHEN exclusion_violation THEN
    UPDATE public.bookings SET status = 'needs_attention', paid_at = now(),
      attention_reason = 'Paid after the hold expired and the nights were taken'
      WHERE id = b.id RETURNING * INTO b;
    PERFORM public.notify_admins('Paid booking needs attention', 'Guest paid after their hold expired and the nights were taken. Refund or move them.', '/admin/bookings');
  END;
  RETURN b;
END $$;
REVOKE ALL ON FUNCTION public.confirm_local_payment(text, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_local_payment(text, bigint) TO service_role;

-- Every-5-minute job
CREATE OR REPLACE FUNCTION public.booking_lifecycle_tick() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _exp int; _rel int; _done int; _delay int := public.setting_int('payout_delay_days', 1);
BEGIN
  PERFORM set_config('app.actor', 'system', true);
  WITH u AS (UPDATE public.bookings SET status = 'expired'
    WHERE status = 'held' AND hold_expires_at < now() RETURNING 1) SELECT count(*) INTO _exp FROM u;
  WITH u AS (UPDATE public.bookings SET status = 'released'
    WHERE status = 'confirmed' AND source <> 'rayprop' AND check_in_date + _delay <= current_date RETURNING 1) SELECT count(*) INTO _rel FROM u;
  WITH u AS (UPDATE public.bookings SET status = 'completed'
    WHERE (status = 'released' OR (status = 'confirmed' AND source = 'rayprop')) AND check_out_date < current_date RETURNING 1) SELECT count(*) INTO _done FROM u;
  RETURN jsonb_build_object('expired', _exp, 'released', _rel, 'completed', _done);
END $$;
REVOKE ALL ON FUNCTION public.booking_lifecycle_tick() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.booking_lifecycle_tick() TO service_role;

CREATE OR REPLACE FUNCTION public.auto_release_due_bookings() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb := public.booking_lifecycle_tick();
BEGIN RETURN (r->>'released')::int; END $$;

-- Payouts use the amount saved on the booking
CREATE OR REPLACE FUNCTION public.queue_payout_on_release() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _host uuid;
BEGIN
  IF NEW.status = 'released' AND OLD.status IS DISTINCT FROM 'released' AND NEW.source <> 'rayprop' AND NEW.listing_id IS NOT NULL THEN
    _host := coalesce(NEW.host_id, (SELECT host_id FROM public.listings WHERE id = NEW.listing_id));
    IF _host IS NOT NULL THEN
      INSERT INTO public.payouts (host_id, booking_id, amount, currency, status)
      VALUES (_host, NEW.id, coalesce(NEW.host_payout_kobo / 100.0, round(NEW.total_price / 1.08)), 'NGN', 'pending')
      ON CONFLICT (booking_id) WHERE booking_id IS NOT NULL DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- Calendar sees the same active statuses
CREATE OR REPLACE FUNCTION public.listing_booked_ranges(_listing_id uuid)
RETURNS TABLE(check_in date, check_out date) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.check_in_date, b.check_out_date FROM public.bookings b
  WHERE b.listing_id = _listing_id AND b.status IN ('held','confirmed','released','needs_attention')
    AND b.check_out_date >= CURRENT_DATE ORDER BY b.check_in_date;
$$;

-- Guest confirms they checked in (releases host payout early)
CREATE OR REPLACE FUNCTION public.guest_confirm_checkin(_booking_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.bookings SET status = 'released'
  WHERE id = _booking_id AND guest_id = auth.uid() AND status = 'confirmed' AND source <> 'rayprop' AND check_in_date <= current_date;
  IF NOT FOUND THEN RAISE EXCEPTION 'This booking cannot be released yet'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.guest_confirm_checkin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guest_confirm_checkin(uuid) TO authenticated;

-- Staff actions
CREATE OR REPLACE FUNCTION public.staff_booking_action(_booking_id uuid, _action text, _note text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _action = 'note' THEN
    IF coalesce(btrim(_note), '') = '' THEN RAISE EXCEPTION 'Note is empty'; END IF;
    PERFORM public.log_booking_event(_booking_id, 'note', 'staff', jsonb_build_object('body', left(_note, 2000)));
  ELSIF _action = 'release' THEN
    UPDATE public.bookings SET status = 'released' WHERE id = _booking_id AND status = 'confirmed';
    IF NOT FOUND THEN RAISE EXCEPTION 'Only confirmed bookings can be released'; END IF;
  ELSIF _action = 'confirm' THEN
    UPDATE public.bookings SET status = 'confirmed', attention_reason = NULL WHERE id = _booking_id AND status = 'needs_attention';
    IF NOT FOUND THEN RAISE EXCEPTION 'Only bookings that need attention can be confirmed here'; END IF;
  ELSE RAISE EXCEPTION 'Unknown action';
  END IF;
  INSERT INTO public.admin_audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'booking_' || _action, 'booking', _booking_id::text, jsonb_build_object('note', _note));
END $$;
REVOKE ALL ON FUNCTION public.staff_booking_action(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_booking_action(uuid, text, text) TO authenticated;

-- Guests/hosts no longer write booking rows directly
DROP POLICY IF EXISTS "Guests update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Guests create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins update all bookings" ON public.bookings;
