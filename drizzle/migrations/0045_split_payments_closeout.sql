ALTER TABLE public.payment_shares
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS removed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_reminded_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pay_method text;

-- Email to an address (not necessarily a user).
CREATE OR REPLACE FUNCTION public.send_email_to(_to text, _subject text, _heading text, _body text, _link text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _mid uuid := gen_random_uuid(); _url text := 'https://stayglobal.app' || coalesce(_link, '/');
BEGIN
  IF coalesce(_to,'') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.suppressed_emails WHERE email = lower(_to)) THEN RETURN; END IF;
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'message_id', _mid::text, 'to', lower(_to),
    'from', 'StayGlobal <noreply@notify.stayglobal.app>', 'sender_domain', 'notify.stayglobal.app',
    'subject', _subject,
    'html', '<!doctype html><html><body style="font-family:Helvetica,Arial,sans-serif"><div style="max-width:520px;margin:0 auto;padding:32px 24px"><div style="font-size:20px;font-weight:800;margin-bottom:24px">Stay</div><h1 style="font-size:18px">' || _heading || '</h1><p style="font-size:14px;line-height:1.6">' || _body || '</p><a href="' || _url || '" style="display:inline-block;background:#e0b64c;color:#0b0b0f;font-weight:700;padding:12px 20px;border-radius:999px;text-decoration:none">Pay your share</a></div></body></html>',
    'text', _heading || E'\n\n' || _body || E'\n\n' || _url,
    'purpose', 'transactional', 'label', 'split_reminder',
    'idempotency_key', 'split-' || _mid::text, 'queued_at', now()));
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'send_email_to failed: %', SQLERRM;
END $$;
REVOKE ALL ON FUNCTION public.send_email_to(text,text,text,text,text) FROM PUBLIC, anon, authenticated;

-- Removed shares are no longer payable.
CREATE OR REPLACE FUNCTION public.get_payment_share(_token text)
RETURNS TABLE(share_id uuid, booking_id uuid, amount_kobo bigint, status text, booking_status text, title text, city text, check_in date, check_out date, lead_first_name text, shares_total integer, shares_paid integer, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, b.id, s.amount_kobo, s.status, b.status, coalesce(l.title, b.partner_title), coalesce(l.city, b.partner_city),
         b.check_in_date, b.check_out_date, split_part(coalesce(p.full_name, 'A friend'), ' ', 1),
         (SELECT count(*)::int FROM public.payment_shares x WHERE x.booking_id = b.id AND x.status <> 'void'),
         (SELECT count(*)::int FROM public.payment_shares x WHERE x.booking_id = b.id AND x.status = 'paid'),
         b.hold_expires_at
  FROM public.payment_shares s JOIN public.bookings b ON b.id = s.booking_id
  LEFT JOIN public.listings l ON l.id = b.listing_id
  LEFT JOIN public.profiles p ON p.user_id = b.guest_id
  WHERE char_length(coalesce(_token,'')) >= 16 AND s.token = _token AND s.status <> 'void'
$$;

-- Organiser: remove an unpaid person (amount moves to organiser) or send a reminder.
CREATE OR REPLACE FUNCTION public.split_share_action(_share_id uuid, _action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.payment_shares; b public.bookings; mine public.payment_shares; nxt int;
BEGIN
  SELECT * INTO s FROM public.payment_shares WHERE id = _share_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Share not found'; END IF;
  SELECT * INTO b FROM public.bookings WHERE id = s.booking_id FOR UPDATE;
  IF auth.uid() IS NULL OR b.guest_id <> auth.uid() THEN RAISE EXCEPTION 'Only the organiser can do this'; END IF;
  IF b.status <> 'held' THEN RAISE EXCEPTION 'This booking is no longer waiting for payment'; END IF;
  IF s.status <> 'pending' THEN RAISE EXCEPTION 'Only unpaid shares can be changed'; END IF;
  IF EXISTS (SELECT 1 FROM public.bank_transfers WHERE reference = s.reference AND status = 'submitted') THEN
    RAISE EXCEPTION 'A bank transfer for this share is being checked'; END IF;
  IF _action = 'remind' THEN
    IF s.last_reminded_at > now() - interval '1 hour' THEN RAISE EXCEPTION 'A reminder was sent less than an hour ago'; END IF;
    UPDATE public.payment_shares SET last_reminded_at = now(), reminder_count = reminder_count + 1 WHERE id = s.id;
    PERFORM public.send_email_to(s.email, 'Reminder: pay your share', 'Your share is waiting',
      'Please pay your share of ₦' || to_char(s.amount_kobo/100.0, 'FM999,999,999') || ' by ' || to_char(b.hold_expires_at AT TIME ZONE 'Africa/Lagos', 'DD Mon HH24:MI') || ' (Lagos time) so the booking can be confirmed.', '/pay/share/' || s.token);
    IF s.payer_user_id IS NOT NULL AND s.payer_user_id <> b.guest_id THEN
      INSERT INTO public.notifications(user_id, type, title, body, link) VALUES (s.payer_user_id, 'payment', 'Pay your share', 'Your share of a stay is waiting to be paid.', '/pay/share/' || s.token);
    END IF;
  ELSIF _action = 'remove' THEN
    IF s.share_no = 1 THEN RAISE EXCEPTION 'You cannot remove your own share'; END IF;
    UPDATE public.payment_shares SET status = 'void', removed_at = now(), reference = NULL WHERE id = s.id;
    SELECT * INTO mine FROM public.payment_shares WHERE booking_id = b.id AND share_no = 1 FOR UPDATE;
    IF mine.status = 'pending' THEN
      UPDATE public.payment_shares SET amount_kobo = amount_kobo + s.amount_kobo, reference = NULL WHERE id = mine.id;
    ELSE
      SELECT coalesce(max(share_no),0) + 1 INTO nxt FROM public.payment_shares WHERE booking_id = b.id;
      INSERT INTO public.payment_shares(booking_id, share_no, amount_kobo, token, payer_user_id, label, status)
        VALUES (b.id, nxt, s.amount_kobo, replace(gen_random_uuid()::text,'-','') || substr(gen_random_uuid()::text,1,8), b.guest_id, 'You (extra)', 'pending');
    END IF;
    PERFORM public.log_booking_event(b.id, 'share_removed', 'guest', jsonb_build_object('share_no', s.share_no, 'amount_kobo', s.amount_kobo));
  ELSE RAISE EXCEPTION 'Unknown action'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.split_share_action(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.split_share_action(uuid, text) TO authenticated;

-- Scheduled reminders: every 12h, plus one 2h before time runs out.
CREATE OR REPLACE FUNCTION public.split_reminders_tick()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN
    SELECT s.*, b.hold_expires_at, b.guest_id AS organiser FROM public.payment_shares s JOIN public.bookings b ON b.id = s.booking_id
    WHERE b.status = 'held' AND b.is_split AND s.status = 'pending' AND s.share_no > 1 AND b.hold_expires_at > now()
      AND ( (s.last_reminded_at IS NULL AND s.created_at < now() - interval '1 hour')
         OR s.last_reminded_at < now() - interval '12 hours'
         OR (b.hold_expires_at < now() + interval '2 hours' AND (s.last_reminded_at IS NULL OR s.last_reminded_at < b.hold_expires_at - interval '2 hours')) )
    FOR UPDATE OF s SKIP LOCKED
  LOOP
    UPDATE public.payment_shares SET last_reminded_at = now(), reminder_count = reminder_count + 1 WHERE id = r.id;
    PERFORM public.send_email_to(r.email, 'Reminder: pay your share', 'Your share is waiting',
      'Please pay your share of ₦' || to_char(r.amount_kobo/100.0, 'FM999,999,999') || ' before ' || to_char(r.hold_expires_at AT TIME ZONE 'Africa/Lagos', 'DD Mon HH24:MI') || ' (Lagos time), or everyone is refunded.', '/pay/share/' || r.token);
    INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (r.organiser, 'payment', 'Waiting on ' || coalesce(r.name, r.label, 'Person ' || r.share_no), 'Their share is still unpaid. Send them a reminder or remove them.', '/trips/' || r.booking_id);
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.split_reminders_tick() FROM PUBLIC, anon, authenticated;

-- Bank-transfer shares: approval marks the share paid; rejection just frees the share.
CREATE OR REPLACE FUNCTION public.staff_bank_transfer_action(_id uuid, _action text, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.bank_transfers; b public.bookings; is_share boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT private.has_any_role(auth.uid(), ARRAY['admin','finance']::public.app_role[]) THEN
    RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO t FROM public.bank_transfers WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfer not found'; END IF;
  IF t.status NOT IN ('submitted','awaiting_proof') THEN RAISE EXCEPTION 'Already decided'; END IF;
  is_share := t.meta ? 'share_id';
  IF _action = 'reject' THEN
    IF coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'A reason is needed to reject'; END IF;
    UPDATE public.bank_transfers SET status = 'rejected', reject_reason = left(trim(_reason), 300), decided_by = auth.uid(), decided_at = now() WHERE id = _id;
    IF is_share THEN
      UPDATE public.payment_shares SET reference = NULL, pay_method = NULL WHERE id = (t.meta->>'share_id')::uuid AND status = 'pending';
      INSERT INTO public.notifications(user_id, type, title, body, link)
        VALUES (t.guest_id, 'payment', 'Bank transfer not accepted', trim(_reason), '/bookings');
    ELSE
      IF t.booking_id IS NOT NULL THEN
        PERFORM set_config('app.actor', 'staff', true);
        UPDATE public.bookings SET status = 'cancelled', cancelled_at = now(), cancelled_reason = 'Bank transfer rejected: ' || trim(_reason)
          WHERE id = t.booking_id AND status = 'held';
      END IF;
      INSERT INTO public.notifications(user_id, type, title, body, link)
        VALUES (t.guest_id, 'payment', 'Bank transfer not accepted', trim(_reason), '/bookings');
      PERFORM public.send_alert_email(t.guest_id, 'Your bank transfer was not accepted', 'Bank transfer not accepted', 'Reason: ' || trim(_reason) || '. Your dates have been released. Contact support if you think this is a mistake.', '/bookings');
    END IF;
  ELSIF _action = 'approve' THEN
    IF t.source = 'rayprop' THEN RAISE EXCEPTION 'Partner transfers are approved through the partner booking step'; END IF;
    UPDATE public.bank_transfers SET status = 'approved', decided_by = auth.uid(), decided_at = now() WHERE id = _id;
    IF is_share THEN
      b := public.record_share_payment(t.reference, t.amount_kobo, t.guest_id);
      IF b.status <> 'confirmed' THEN
        INSERT INTO public.notifications(user_id, type, title, body, link)
          VALUES (t.guest_id, 'payment', 'Share received', 'Your bank transfer for your share was received. The booking confirms once everyone has paid.', '/bookings');
      END IF;
    ELSE
      b := public.confirm_local_payment(t.reference, t.amount_kobo);
      IF b.status <> 'confirmed' THEN
        INSERT INTO public.notifications(user_id, type, title, body, link)
          VALUES (t.guest_id, 'payment', 'Payment received', 'Your bank transfer was received. Your booking is ' || replace(b.status, '_', ' ') || '.', '/bookings');
      END IF;
    END IF;
  ELSE RAISE EXCEPTION 'Unknown action'; END IF;
  INSERT INTO public.admin_audit_log(actor_id, action, entity_type, entity_id, metadata)
    VALUES (auth.uid(), 'bank_transfer_' || _action, 'bank_transfer', _id::text, jsonb_build_object('reference', t.reference, 'reason', _reason, 'amount_kobo', t.amount_kobo, 'share', is_share));
END $$;

-- Share receipts must not extend the whole group's hold.
CREATE OR REPLACE FUNCTION public.submit_bank_transfer(_id uuid, _sender text, _receipt_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.bank_transfers;
BEGIN
  SELECT * INTO t FROM public.bank_transfers WHERE id = _id FOR UPDATE;
  IF NOT FOUND OR t.guest_id <> auth.uid() THEN RAISE EXCEPTION 'Transfer not found'; END IF;
  IF t.status <> 'awaiting_proof' THEN RAISE EXCEPTION 'This transfer can no longer be updated'; END IF;
  IF t.expires_at < now() THEN RAISE EXCEPTION 'Time to pay has run out. Please start again.'; END IF;
  IF coalesce(trim(_sender),'') = '' OR coalesce(_receipt_path,'') = '' THEN RAISE EXCEPTION 'Add the sender name and a receipt'; END IF;
  IF split_part(_receipt_path, '/', 1) <> auth.uid()::text THEN RAISE EXCEPTION 'Invalid receipt'; END IF;
  IF t.booking_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = t.booking_id AND status = 'held') THEN
    RAISE EXCEPTION 'Your dates are no longer held. Please start again.'; END IF;
  UPDATE public.bank_transfers SET status = 'submitted', sender_name = left(trim(_sender), 120), receipt_path = _receipt_path, submitted_at = now() WHERE id = _id;
  IF t.booking_id IS NOT NULL AND NOT (t.meta ? 'share_id') THEN
    UPDATE public.bookings SET hold_expires_at = now() + interval '7 days', payment_expires_at = now() + interval '7 days'
      WHERE id = t.booking_id AND status = 'held';
  END IF;
  INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (t.guest_id, 'payment', 'Payment being checked', 'We got your transfer receipt and will confirm shortly.', '/bookings');
  INSERT INTO public.notifications(user_id, type, title, body, link)
    SELECT DISTINCT user_id, 'payment', 'Bank transfer to check', coalesce(t.title,'A stay') || CASE WHEN t.meta ? 'share_id' THEN ' (split share)' ELSE '' END || ' — ₦' || to_char(t.amount_kobo/100.0, 'FM999,999,999'), '/admin/bank-transfers'
    FROM public.user_roles WHERE role IN ('admin','finance');
END $$;