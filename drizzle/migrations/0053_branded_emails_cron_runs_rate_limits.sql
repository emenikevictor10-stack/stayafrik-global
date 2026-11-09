-- Shared branded email layout (PRD: wordmark at top, plain copy, one button)
CREATE OR REPLACE FUNCTION public.email_esc(t text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT replace(replace(replace(replace(coalesce(t,''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;') $$;

CREATE OR REPLACE FUNCTION public.email_layout(_heading text, _body text, _url text, _button text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT '<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Figtree,Helvetica,Arial,sans-serif;color:#1d2733">'
    || '<div style="max-width:520px;margin:0 auto;padding:32px 24px">'
    || '<div style="margin-bottom:28px"><img src="https://stayglobal.app/icon-192.png" width="32" height="32" alt="" style="vertical-align:middle;border-radius:8px"> '
    || '<span style="vertical-align:middle;font-size:22px;font-weight:600;color:#275f84;letter-spacing:-0.5px">stayglobal</span></div>'
    || '<h1 style="margin:0 0 12px;font-size:20px;font-weight:600">' || public.email_esc(_heading) || '</h1>'
    || '<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f4c5a">' || replace(public.email_esc(_body), E'\n', '<br>') || '</p>'
    || '<a href="' || public.email_esc(_url) || '" style="display:inline-block;background:#275f84;color:#ffffff;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px;text-decoration:none">' || public.email_esc(coalesce(_button,'Open StayGlobal')) || '</a>'
    || '<p style="margin:32px 0 0;font-size:12px;color:#7a8794">Questions? Reply to support@stayglobal.app</p>'
    || '</div></body></html>' $$;

CREATE OR REPLACE FUNCTION public.send_branded_email(_to text, _subject text, _heading text, _body text, _link text, _button text, _label text, _key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _url text := 'https://stayglobal.app' || coalesce(_link, '/');
BEGIN
  IF coalesce(_to,'') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.suppressed_emails WHERE email = lower(_to)) THEN RETURN; END IF;
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'message_id', gen_random_uuid()::text, 'to', lower(_to),
    'from', 'StayGlobal <noreply@notify.stayglobal.app>', 'sender_domain', 'notify.stayglobal.app',
    'subject', _subject, 'html', public.email_layout(_heading, _body, _url, _button),
    'text', _heading || E'\n\n' || _body || E'\n\n' || _url,
    'purpose', 'transactional', 'label', coalesce(_label,'alert'),
    'idempotency_key', coalesce(_key, gen_random_uuid()::text), 'queued_at', now()));
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'send_branded_email failed: %', SQLERRM;
END $$;
REVOKE ALL ON FUNCTION public.send_branded_email(text,text,text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.send_alert_email(_user_id uuid, _subject text, _heading text, _body text, _link text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _to text;
BEGIN
  SELECT email INTO _to FROM public.profiles WHERE user_id = _user_id;
  PERFORM public.send_branded_email(_to, _subject, _heading, _body, _link, 'Open StayGlobal', 'alert', NULL);
END $$;

CREATE OR REPLACE FUNCTION public.send_email_to(_to text, _subject text, _heading text, _body text, _link text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.send_branded_email(_to, _subject, _heading, _body, _link,
    CASE WHEN coalesce(_link,'') LIKE '/pay/share/%' THEN 'Pay your share' ELSE 'Open StayGlobal' END, 'direct', NULL);
END $$;
REVOKE ALL ON FUNCTION public.send_alert_email(uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.send_email_to(text,text,text,text,text) FROM PUBLIC, anon, authenticated;

-- Booking-stage emails to the guest
CREATE OR REPLACE FUNCTION public.email_on_booking_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _t text; _code text; _to text; _id text := ' (listing ID ' || coalesce(NEW.listing_code,'—') || ')';
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  SELECT coalesce(l.title, NEW.partner_title, 'your stay') INTO _t FROM (SELECT 1) x LEFT JOIN public.listings l ON l.id = NEW.listing_id;
  SELECT email INTO _to FROM public.profiles WHERE user_id = NEW.guest_id;
  IF NEW.status = 'held' THEN
    PERFORM public.send_branded_email(_to, 'Your dates are held: ' || _t, 'Your dates are held',
      _t || _id || E'\n' || to_char(NEW.check_in_date,'DD Mon') || ' – ' || to_char(NEW.check_out_date,'DD Mon YYYY')
      || '. Finish paying' || CASE WHEN NEW.payment_expires_at IS NOT NULL THEN ' before ' || to_char(NEW.payment_expires_at AT TIME ZONE 'Africa/Lagos','HH24:MI DD Mon') || ' (Lagos time)' ELSE '' END || ' to keep them.',
      '/trips/' || NEW.id, 'View your trip', 'booking_held', 'held-' || NEW.id);
  ELSIF NEW.status = 'awaiting_host' THEN
    PERFORM public.send_branded_email(_to, 'Request sent: ' || _t, 'Your request is with the host',
      _t || _id || '. The host has 24 hours to accept. If they don''t, you get a full refund automatically.',
      '/trips/' || NEW.id, 'View your trip', 'host_request_sent', 'reqsent-' || NEW.id);
  ELSIF NEW.status = 'declined' THEN
    PERFORM public.send_branded_email(_to, 'The host couldn''t accept: ' || _t, 'Your request wasn''t accepted',
      _t || _id || '. You will get a full refund. We''ll email you when it''s paid. Similar stays are waiting for you.',
      '/results', 'Find similar stays', 'host_declined', 'declined-' || NEW.id);
  ELSIF NEW.status = 'expired' AND TG_OP = 'UPDATE' AND OLD.status = 'held' THEN
    PERFORM public.send_branded_email(_to, 'Your hold has ended: ' || _t, 'Your hold has ended',
      _t || _id || '. We didn''t receive payment in time, so the dates were released. You can book again if they are still free.',
      '/trips/' || NEW.id, 'Try again', 'hold_expired', 'expired-' || NEW.id);
  ELSIF NEW.status = 'cancelled' AND TG_OP = 'UPDATE' AND OLD.status IN ('confirmed','released','awaiting_host','needs_attention','processing') THEN
    PERFORM public.send_branded_email(_to, 'Booking cancelled: ' || _t, 'Your booking is cancelled',
      _t || _id || '. Any refund due under the cancellation policy is shown in your trip. We''ll email you when it''s paid.',
      '/trips/' || NEW.id, 'View your trip', 'cancelled_refund', 'cancelled-' || NEW.id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'email_on_booking_status: %', SQLERRM; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bookings_status_email ON public.bookings;
CREATE TRIGGER bookings_status_email AFTER INSERT OR UPDATE OF status ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.email_on_booking_status();

-- Bank details email when a bank transfer is started
CREATE OR REPLACE FUNCTION public.email_on_bank_transfer() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _to text; _s jsonb;
BEGIN
  SELECT email INTO _to FROM public.profiles WHERE user_id = NEW.guest_id;
  SELECT jsonb_object_agg(key, value #>> '{}') INTO _s FROM public.app_settings WHERE key IN ('bank_transfer_bank','bank_transfer_number','bank_transfer_name');
  PERFORM public.send_branded_email(_to, 'Bank details for ' || coalesce(NEW.title,'your booking'), 'Pay by bank transfer',
    'Send exactly ₦' || to_char(NEW.amount_kobo / 100.0, 'FM999,999,999,990') || E' to:\n'
    || coalesce(_s->>'bank_transfer_bank','') || E'\n' || coalesce(_s->>'bank_transfer_number','') || E'\n' || coalesce(_s->>'bank_transfer_name','')
    || E'\nUse reference ' || NEW.reference || ' and upload your receipt before '
    || to_char(NEW.expires_at AT TIME ZONE 'Africa/Lagos','HH24:MI DD Mon') || ' (Lagos time).',
    '/pay/transfer/' || NEW.id, 'Upload receipt', 'bank_details', 'bankdetails-' || NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'email_on_bank_transfer: %', SQLERRM; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bank_transfers_email ON public.bank_transfers;
CREATE TRIGGER bank_transfers_email AFTER INSERT ON public.bank_transfers FOR EACH ROW EXECUTE FUNCTION public.email_on_bank_transfer();

-- Refund paid email
CREATE OR REPLACE FUNCTION public.email_on_refund_paid() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _to text; _b record;
BEGIN
  IF NEW.status NOT IN ('processed','success','completed','paid','refunded') OR OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  SELECT b.guest_id, b.listing_code, coalesce(l.title, b.partner_title, 'your stay') t INTO _b FROM public.bookings b LEFT JOIN public.listings l ON l.id = b.listing_id WHERE b.id = NEW.booking_id;
  SELECT email INTO _to FROM public.profiles WHERE user_id = _b.guest_id;
  PERFORM public.send_branded_email(_to, 'Refund paid: ₦' || to_char(NEW.amount, 'FM999,999,999,990'), 'Your refund has been paid',
    '₦' || to_char(NEW.amount, 'FM999,999,999,990') || ' for ' || _b.t || ' (listing ID ' || coalesce(_b.listing_code,'—') || ') is on its way back to you. Banks can take a few working days to show it.',
    '/trips/' || NEW.booking_id, 'View your trip', 'refund_paid', 'refundpaid-' || NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'email_on_refund_paid: %', SQLERRM; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS refunds_paid_email ON public.refunds;
CREATE TRIGGER refunds_paid_email AFTER UPDATE OF status ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.email_on_refund_paid();

-- Scheduler run log
CREATE TABLE IF NOT EXISTS public.cron_runs (
  id bigserial PRIMARY KEY,
  job text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ok boolean NOT NULL,
  summary jsonb
);
GRANT SELECT ON public.cron_runs TO authenticated;
GRANT ALL ON public.cron_runs TO service_role;
ALTER TABLE public.cron_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read cron runs" ON public.cron_runs FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.run_scheduled_ticks() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _j text; _r jsonb;
BEGIN
  FOREACH _j IN ARRAY ARRAY['booking_lifecycle_tick','booking_reminders_tick','support_issue_tick'] LOOP
    BEGIN
      EXECUTE format('SELECT to_jsonb(public.%I())', _j) INTO _r;
      INSERT INTO public.cron_runs(job, ok, summary) VALUES (_j, true, _r);
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.cron_runs(job, ok, summary) VALUES (_j, false, jsonb_build_object('error', SQLERRM));
    END;
  END LOOP;
  DELETE FROM public.cron_runs WHERE started_at < now() - interval '14 days';
END $$;
REVOKE ALL ON FUNCTION public.run_scheduled_ticks() FROM PUBLIC, anon, authenticated;

-- Reminders: add thank-you email and host arrivals-tomorrow email
CREATE OR REPLACE FUNCTION public.booking_reminders_tick() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; _ci int := 0; _ty int := 0; _hn int := 0; _ha int := 0;
BEGIN
  PERFORM set_config('app.actor', 'system', true);
  -- Guest reminders go out from 10:00 Lagos time the day before.
  IF extract(hour FROM now() AT TIME ZONE 'Africa/Lagos') >= 10 THEN
  FOR r IN SELECT b.id, b.guest_id, b.host_id, b.check_in_date, coalesce(l.title, b.partner_title, 'your stay') t, coalesce(b.listing_code, '') code
           FROM public.bookings b LEFT JOIN public.listings l ON l.id = b.listing_id
           WHERE b.status IN ('confirmed','released') AND b.check_in_date = (now() AT TIME ZONE 'Africa/Lagos')::date + 1
             AND NOT EXISTS (SELECT 1 FROM public.booking_events e WHERE e.booking_id = b.id AND e.type = 'reminder_checkin') LOOP
    PERFORM public.log_booking_event(r.id, 'reminder_checkin', 'system', '{}'::jsonb);
    INSERT INTO public.notifications(user_id, type, title, body, link) VALUES (r.guest_id, 'booking', 'Check-in is tomorrow', r.t || ' — the address and check-in time are in your trip.', '/trips/' || r.id);
    PERFORM public.send_alert_email(r.guest_id, 'Check-in tomorrow: ' || r.t, 'Your check-in is tomorrow', r.t || CASE WHEN r.code <> '' THEN ' (listing ID ' || r.code || ')' ELSE '' END || '. The address and check-in time are in your trip.', '/trips/' || r.id);
    _ci := _ci + 1;
    IF r.host_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, type, title, body, link) VALUES (r.host_id, 'booking', 'Guest arriving tomorrow', r.t || ' — a guest checks in tomorrow.', '/host/bookings');
      PERFORM public.send_alert_email(r.host_id, 'Guest arriving tomorrow: ' || r.t, 'A guest arrives tomorrow', r.t || CASE WHEN r.code <> '' THEN ' (listing ID ' || r.code || ')' ELSE '' END || '. Please make sure the place is clean and ready.', '/host/bookings');
      _ha := _ha + 1;
    END IF;
  END LOOP;
  END IF;
  FOR r IN SELECT b.id, b.guest_id, coalesce(l.title, b.partner_title, 'your stay') t, coalesce(b.listing_code,'') code
           FROM public.bookings b LEFT JOIN public.listings l ON l.id = b.listing_id
           WHERE b.status IN ('completed','released') AND b.check_out_date BETWEEN current_date - 3 AND current_date - 1
             AND NOT EXISTS (SELECT 1 FROM public.booking_events e WHERE e.booking_id = b.id AND e.type = 'thank_you') LOOP
    PERFORM public.log_booking_event(r.id, 'thank_you', 'system', '{}'::jsonb);
    INSERT INTO public.notifications(user_id, type, title, body, link) VALUES (r.guest_id, 'booking', 'Thanks for staying', 'How was ' || r.t || '? A short review helps other guests.', '/trips/' || r.id || '/review');
    PERFORM public.send_alert_email(r.guest_id, 'Thanks for staying at ' || r.t, 'Thanks for staying with us', 'How was ' || r.t || CASE WHEN r.code <> '' THEN ' (listing ID ' || r.code || ')' ELSE '' END || '? A short review helps other guests choose.', '/trips/' || r.id || '/review');
    _ty := _ty + 1;
  END LOOP;
  FOR r IN SELECT b.id, b.host_id FROM public.bookings b
           WHERE b.status = 'awaiting_host' AND b.host_id IS NOT NULL AND b.host_respond_by BETWEEN now() AND now() + interval '4 hours'
             AND NOT EXISTS (SELECT 1 FROM public.booking_events e WHERE e.booking_id = b.id AND e.type = 'host_deadline_nudge') LOOP
    PERFORM public.log_booking_event(r.id, 'host_deadline_nudge', 'system', '{}'::jsonb);
    INSERT INTO public.notifications(user_id, type, title, body, link) VALUES (r.host_id, 'booking_request', 'Booking request closing soon', 'Accept or decline within 4 hours or the guest is refunded.', '/host/requests');
    PERFORM public.send_alert_email(r.host_id, 'A booking request closes soon', 'Reply within 4 hours', 'A guest has paid and is waiting. Accept or decline before the time runs out, or they will be refunded.', '/host/requests');
    _hn := _hn + 1;
  END LOOP;
  RETURN jsonb_build_object('checkin_reminders', _ci, 'host_arrivals', _ha, 'thank_yous', _ty, 'host_nudges', _hn);
END $$;

-- Rate limits on guest actions (server-side, per user)
CREATE OR REPLACE FUNCTION public.rate_limit_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n int; _max int := TG_ARGV[1]::int; _col text := TG_ARGV[0];
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF; -- server/system inserts are not limited
  EXECUTE format('SELECT count(*) FROM %I.%I WHERE %I = $1 AND created_at > now() - interval ''1 hour''', TG_TABLE_SCHEMA, TG_TABLE_NAME, _col)
    INTO _n USING auth.uid();
  IF _n >= _max THEN
    RAISE EXCEPTION 'Too many requests. Please wait a while and try again.' USING ERRCODE = 'P0429';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS reservations_rate_limit ON public.reservations;
CREATE TRIGGER reservations_rate_limit BEFORE INSERT ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.rate_limit_guard('guest_id', '10');
DROP TRIGGER IF EXISTS support_issues_rate_limit ON public.support_issues;
CREATE TRIGGER support_issues_rate_limit BEFORE INSERT ON public.support_issues FOR EACH ROW EXECUTE FUNCTION public.rate_limit_guard('user_id', '10');
DROP TRIGGER IF EXISTS messages_rate_limit ON public.messages;
CREATE TRIGGER messages_rate_limit BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.rate_limit_guard('sender_id', '120');