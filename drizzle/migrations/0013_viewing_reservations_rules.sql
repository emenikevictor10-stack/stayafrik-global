CREATE OR REPLACE FUNCTION public.on_reservation_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _title text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  SELECT title INTO _title FROM public.listings WHERE id = NEW.listing_id;

  IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    NEW.approved_at := now();
    NEW.expires_at := greatest(now(), coalesce(NEW.visit_at, now())) + INTERVAL '4 hours';
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (NEW.guest_id, 'reservation', 'Viewing approved 🎉', 'Your 4h hold is active for: ' || COALESCE(_title,'the listing'), '/reservations');
    PERFORM public.send_alert_email(NEW.guest_id, 'Your viewing was approved', 'Viewing approved',
      'The host approved your 4-hour viewing hold on <strong>' || COALESCE(_title,'the listing') || '</strong>.', '/reservations');
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (NEW.guest_id, 'reservation', 'Viewing request declined', 'Host declined your request for: ' || COALESCE(_title,'the listing'), '/reservations');
    PERFORM public.send_alert_email(NEW.guest_id, 'Your viewing request was declined', 'Viewing request declined',
      'The host declined your viewing request for <strong>' || COALESCE(_title,'the listing') || '</strong>.', '/reservations');
  ELSIF NEW.status = 'expired' AND OLD.status = 'pending' THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (NEW.guest_id, 'reservation', 'Viewing request expired', 'The host did not reply in time for: ' || COALESCE(_title,'the listing'), '/reservations');
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.expire_reservations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n1 integer; n2 integer;
BEGIN
  UPDATE public.reservations SET status = 'expired' WHERE status = 'pending' AND created_at < now() - INTERVAL '4 hours';
  GET DIAGNOSTICS n1 = ROW_COUNT;
  UPDATE public.reservations SET status = 'expired' WHERE status = 'approved' AND expires_at < now();
  GET DIAGNOSTICS n2 = ROW_COUNT;
  RETURN n1 + n2;
END; $$;
REVOKE EXECUTE ON FUNCTION public.expire_reservations() FROM PUBLIC, anon, authenticated;

SELECT public.expire_reservations();

CREATE UNIQUE INDEX IF NOT EXISTS reservations_one_open_per_guest
  ON public.reservations (listing_id, guest_id) WHERE status IN ('pending','approved');

SELECT cron.schedule('expire-reservations', '0 * * * *', $c$ SELECT public.expire_reservations(); $c$);