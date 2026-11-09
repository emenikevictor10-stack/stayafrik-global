CREATE OR REPLACE FUNCTION public.notify_on_booking()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE l record; _addr text; _host_name text;
BEGIN
  IF NEW.listing_id IS NULL THEN RETURN NEW; END IF;
  -- Only when a booking becomes confirmed (paid), never for unpaid holds.
  IF NEW.status <> 'confirmed' OR (TG_OP = 'UPDATE' AND OLD.status = 'confirmed') THEN RETURN NEW; END IF;
  SELECT host_id, title, address, neighborhood, city, state, listing_code INTO l FROM public.listings WHERE id = NEW.listing_id;
  IF l.host_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (l.host_id, 'booking', 'New booking', 'A guest booked ' || COALESCE(l.title,'your listing') || ' · ' || NEW.check_in_date || ' to ' || NEW.check_out_date, '/host/bookings');
    PERFORM public.send_alert_email(l.host_id, 'New booking on StayGlobal', 'You have a new booking',
      'A guest just booked <strong>' || replace(COALESCE(l.title,'your listing'),'<','&lt;') || '</strong> for ' || NEW.check_in_date || ' to ' || NEW.check_out_date || '.', '/host/bookings');
  END IF;
  _addr := concat_ws(', ', NULLIF(l.address,''), NULLIF(l.neighborhood,''), NULLIF(l.city,''), NULLIF(l.state,''));
  SELECT split_part(COALESCE(full_name,'your host'),' ',1) INTO _host_name FROM public.profiles WHERE user_id = l.host_id;
  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (NEW.guest_id, 'booking', 'Booking confirmed', COALESCE(l.title,'Your stay') || ' · ' || NEW.check_in_date || ' to ' || NEW.check_out_date, '/trips/' || NEW.id);
  PERFORM public.send_alert_email(NEW.guest_id, 'Your StayGlobal booking is confirmed', 'Booking confirmed',
    '<strong>' || replace(COALESCE(l.title,'Your stay'),'<','&lt;') || '</strong> (Listing ID ' || COALESCE(l.listing_code,'') || ')<br/><br/>'
    || '<strong>Address:</strong> ' || replace(COALESCE(NULLIF(_addr,''),'Shared in your trip page'),'<','&lt;') || '<br/>'
    || '<a href="https://www.google.com/maps/search/?api=1&query=' || replace(COALESCE(_addr,''),' ','+') || '" style="color:#e0b64c">Get directions</a><br/><br/>'
    || '<strong>Check-in:</strong> ' || NEW.check_in_date || ' (from 2:00 PM)<br/><strong>Check-out:</strong> ' || NEW.check_out_date || ' (by 12:00 PM)<br/>'
    || '<strong>Nights:</strong> ' || (NEW.check_out_date - NEW.check_in_date) || ' · <strong>Guests:</strong> ' || COALESCE(NEW.guest_count, 1) || '<br/>'
    || '<strong>Paid:</strong> ₦' || to_char(NEW.total_price,'FM999,999,999') || ' · <strong>Ref:</strong> ' || COALESCE(NEW.payment_reference,'') || '<br/><br/>'
    || 'Your host is ' || COALESCE(_host_name,'your host') || ' — message them in the app.<br/><br/>'
    || '<span style="font-size:12px">Cancellation: full refund 48h+ before check-in, 50% within 48h, none after check-in. Help: support@stayglobal.app</span>',
    '/trips/' || NEW.id);
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS trg_notify_booking ON public.bookings;
CREATE TRIGGER trg_notify_booking AFTER INSERT OR UPDATE OF status ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.notify_on_booking();

CREATE OR REPLACE FUNCTION public.staff_bank_transfer_action(_id uuid, _action text, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.bank_transfers; b public.bookings;
BEGIN
  IF auth.uid() IS NULL OR NOT private.has_any_role(auth.uid(), ARRAY['admin','finance']::public.app_role[]) THEN
    RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO t FROM public.bank_transfers WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfer not found'; END IF;
  IF t.status NOT IN ('submitted','awaiting_proof') THEN RAISE EXCEPTION 'Already decided'; END IF;
  IF _action = 'reject' THEN
    IF coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'A reason is needed to reject'; END IF;
    UPDATE public.bank_transfers SET status = 'rejected', reject_reason = left(trim(_reason), 300), decided_by = auth.uid(), decided_at = now() WHERE id = _id;
    IF t.booking_id IS NOT NULL THEN
      PERFORM set_config('app.actor', 'staff', true);
      UPDATE public.bookings SET status = 'cancelled', cancelled_at = now(), cancelled_reason = 'Bank transfer rejected: ' || trim(_reason)
        WHERE id = t.booking_id AND status = 'held';
    END IF;
    INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (t.guest_id, 'payment', 'Bank transfer not accepted', trim(_reason), '/bookings');
    PERFORM public.send_alert_email(t.guest_id, 'Your bank transfer was not accepted', 'Bank transfer not accepted', 'Reason: ' || trim(_reason) || '. Your dates have been released. Contact support if you think this is a mistake.', '/bookings');
  ELSIF _action = 'approve' THEN
    IF t.source = 'rayprop' THEN RAISE EXCEPTION 'Partner transfers are approved through the partner booking step'; END IF;
    UPDATE public.bank_transfers SET status = 'approved', decided_by = auth.uid(), decided_at = now() WHERE id = _id;
    b := public.confirm_local_payment(t.reference, t.amount_kobo);
    -- Confirmed bookings get the confirmation alert + email from trg_notify_booking.
    IF b.status <> 'confirmed' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link)
        VALUES (t.guest_id, 'payment', 'Payment received', 'Your bank transfer was received. Your booking is ' || replace(b.status, '_', ' ') || '.', '/bookings');
    END IF;
  ELSE RAISE EXCEPTION 'Unknown action'; END IF;
  INSERT INTO public.admin_audit_log(actor_id, action, entity_type, entity_id, metadata)
    VALUES (auth.uid(), 'bank_transfer_' || _action, 'bank_transfer', _id::text, jsonb_build_object('reference', t.reference, 'reason', _reason, 'amount_kobo', t.amount_kobo));
END $$;