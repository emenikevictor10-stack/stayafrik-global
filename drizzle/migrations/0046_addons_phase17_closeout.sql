ALTER TABLE public.addons ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES public.locations(id);
ALTER TABLE public.addon_orders DROP CONSTRAINT IF EXISTS addon_orders_status_check;
UPDATE public.addon_orders SET status = 'confirmed' WHERE status = 'arranged';
ALTER TABLE public.addon_orders ADD CONSTRAINT addon_orders_status_check CHECK (status IN ('pending_payment','paid','needs_attention','confirmed','done','refund_due','refunded','cancelled'));
ALTER TABLE public.addon_orders ADD COLUMN IF NOT EXISTS pay_method text;

CREATE OR REPLACE FUNCTION public.staff_addon_action(_order_id uuid, _action text, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.addon_orders; nxt text; act text := CASE WHEN _action = 'arranged' THEN 'confirm' ELSE _action END;
BEGIN
  IF NOT private.has_any_role(auth.uid(), '{admin,support,finance}'::public.app_role[]) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO o FROM public.addon_orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  nxt := CASE
    WHEN act = 'confirm' AND o.status IN ('paid','needs_attention') THEN 'confirmed'
    WHEN act = 'done' AND o.status = 'confirmed' THEN 'done'
    WHEN act = 'cancel' AND o.status = 'pending_payment' THEN 'cancelled'
    WHEN act = 'cancel' AND o.status IN ('paid','needs_attention','confirmed') THEN 'refund_due'
    WHEN act = 'refunded' AND o.status = 'refund_due' THEN 'refunded'
    ELSE NULL END;
  IF nxt IS NULL THEN RAISE EXCEPTION 'That action is not possible for this order'; END IF;
  UPDATE public.addon_orders SET status = nxt, staff_note = coalesce(nullif(left(_note,300),''), staff_note),
    arranged_by = CASE WHEN nxt = 'confirmed' THEN auth.uid() ELSE arranged_by END,
    arranged_at = CASE WHEN nxt = 'confirmed' THEN now() ELSE arranged_at END
  WHERE id = o.id;
  INSERT INTO public.notifications(user_id, type, title, body, link) VALUES (o.guest_id, 'booking',
    o.addon_name || CASE nxt WHEN 'confirmed' THEN ' is confirmed' WHEN 'done' THEN ' is done' WHEN 'refund_due' THEN ' was cancelled — refund on its way' WHEN 'refunded' THEN ' refund sent' ELSE ' was cancelled' END,
    coalesce(_note,''), '/trips/' || o.booking_id);
  PERFORM public.log_booking_event(o.booking_id, 'addon_' || nxt, 'staff', jsonb_build_object('addon', o.addon_name, 'note', _note));
  INSERT INTO public.admin_audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'addon_' || act, 'addon_order', o.id::text, jsonb_build_object('note', _note, 'from', o.status, 'to', nxt));
END $$;

CREATE OR REPLACE FUNCTION public.guest_addon_cancel(_order_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.addon_orders; nxt text;
BEGIN
  SELECT * INTO o FROM public.addon_orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL OR o.guest_id <> auth.uid() THEN RAISE EXCEPTION 'Order not found'; END IF;
  nxt := CASE WHEN o.status = 'pending_payment' THEN 'cancelled' WHEN o.status IN ('paid','needs_attention') THEN 'refund_due' ELSE NULL END;
  IF nxt IS NULL THEN RAISE EXCEPTION 'This extra is already arranged — contact support to change it'; END IF;
  UPDATE public.addon_orders SET status = nxt WHERE id = o.id;
  IF o.status = 'pending_payment' THEN
    UPDATE public.bank_transfers SET status = 'expired' WHERE reference = o.reference AND status = 'awaiting_proof';
  END IF;
  PERFORM public.log_booking_event(o.booking_id, 'addon_' || nxt, 'guest', jsonb_build_object('addon', o.addon_name));
  IF nxt = 'refund_due' THEN
    PERFORM public.notify_admins('Extra refund to send', o.addon_name || ' — ₦' || to_char(o.amount_kobo/100.0, 'FM999,999,999') || ' (ref ' || coalesce(o.reference,'') || ')', '/admin/addons');
  END IF;
  RETURN nxt;
END $$;
REVOKE ALL ON FUNCTION public.guest_addon_cancel(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guest_addon_cancel(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_bank_transfer(_id uuid, _sender text, _receipt_path text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE t public.bank_transfers; is_addon boolean;
BEGIN
  SELECT * INTO t FROM public.bank_transfers WHERE id = _id FOR UPDATE;
  IF NOT FOUND OR t.guest_id <> auth.uid() THEN RAISE EXCEPTION 'Transfer not found'; END IF;
  is_addon := t.meta ? 'addon_order_id';
  IF t.status <> 'awaiting_proof' THEN RAISE EXCEPTION 'This transfer can no longer be updated'; END IF;
  IF t.expires_at < now() THEN RAISE EXCEPTION 'Time to pay has run out. Please start again.'; END IF;
  IF coalesce(trim(_sender),'') = '' OR coalesce(_receipt_path,'') = '' THEN RAISE EXCEPTION 'Add the sender name and a receipt'; END IF;
  IF split_part(_receipt_path, '/', 1) <> auth.uid()::text THEN RAISE EXCEPTION 'Invalid receipt'; END IF;
  IF is_addon THEN
    IF NOT EXISTS (SELECT 1 FROM public.addon_orders WHERE id = (t.meta->>'addon_order_id')::uuid AND status = 'pending_payment') THEN
      RAISE EXCEPTION 'This extra is no longer waiting for payment'; END IF;
  ELSIF t.booking_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = t.booking_id AND status = 'held') THEN
    RAISE EXCEPTION 'Your dates are no longer held. Please start again.'; END IF;
  UPDATE public.bank_transfers SET status = 'submitted', sender_name = left(trim(_sender), 120), receipt_path = _receipt_path, submitted_at = now() WHERE id = _id;
  IF t.booking_id IS NOT NULL AND NOT (t.meta ? 'share_id') AND NOT is_addon THEN
    UPDATE public.bookings SET hold_expires_at = now() + interval '7 days', payment_expires_at = now() + interval '7 days'
      WHERE id = t.booking_id AND status = 'held';
  END IF;
  INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (t.guest_id, 'payment', 'Payment being checked', 'We got your transfer receipt and will confirm shortly.', '/bookings');
  INSERT INTO public.notifications(user_id, type, title, body, link)
    SELECT DISTINCT user_id, 'payment', 'Bank transfer to check', coalesce(t.title,'A stay') || CASE WHEN t.meta ? 'share_id' THEN ' (split share)' WHEN is_addon THEN ' (extra)' ELSE '' END || ' — ₦' || to_char(t.amount_kobo/100.0, 'FM999,999,999'), '/admin/bank-transfers'
    FROM public.user_roles WHERE role IN ('admin','finance');
END $function$;

CREATE OR REPLACE FUNCTION public.staff_bank_transfer_action(_id uuid, _action text, _reason text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE t public.bank_transfers; b public.bookings; is_share boolean; is_addon boolean; o public.addon_orders;
BEGIN
  IF auth.uid() IS NULL OR NOT private.has_any_role(auth.uid(), ARRAY['admin','finance']::public.app_role[]) THEN
    RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO t FROM public.bank_transfers WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfer not found'; END IF;
  IF t.status NOT IN ('submitted','awaiting_proof') THEN RAISE EXCEPTION 'Already decided'; END IF;
  is_share := t.meta ? 'share_id';
  is_addon := t.meta ? 'addon_order_id';
  IF _action = 'reject' THEN
    IF coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'A reason is needed to reject'; END IF;
    UPDATE public.bank_transfers SET status = 'rejected', reject_reason = left(trim(_reason), 300), decided_by = auth.uid(), decided_at = now() WHERE id = _id;
    IF is_addon THEN
      UPDATE public.addon_orders SET status = 'cancelled', staff_note = 'Bank transfer rejected: ' || left(trim(_reason),250)
        WHERE id = (t.meta->>'addon_order_id')::uuid AND status = 'pending_payment';
      INSERT INTO public.notifications(user_id, type, title, body, link)
        VALUES (t.guest_id, 'payment', 'Bank transfer for your extra not accepted', trim(_reason), '/trips/' || t.booking_id);
    ELSIF is_share THEN
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
    IF t.source = 'rayprop' AND NOT is_addon THEN RAISE EXCEPTION 'Partner transfers are approved through the partner booking step'; END IF;
    UPDATE public.bank_transfers SET status = 'approved', decided_by = auth.uid(), decided_at = now() WHERE id = _id;
    IF is_addon THEN
      o := public.confirm_addon_payment(t.reference, t.amount_kobo);
      INSERT INTO public.notifications(user_id, type, title, body, link)
        VALUES (t.guest_id, 'payment', 'Payment received for ' || o.addon_name, 'We''ll arrange it and let you know.', '/trips/' || t.booking_id);
    ELSIF is_share THEN
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
    VALUES (auth.uid(), 'bank_transfer_' || _action, 'bank_transfer', _id::text, jsonb_build_object('reference', t.reference, 'reason', _reason, 'amount_kobo', t.amount_kobo, 'share', is_share, 'addon', is_addon));
END $function$;

CREATE OR REPLACE FUNCTION public.admin_insights(_from date, _to date)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE len int := greatest(1, _to - _from + 1); pf date := _from - len; pt date := _from - 1; j jsonb;
BEGIN
  IF NOT private.has_any_role(auth.uid(), '{admin,finance}'::public.app_role[]) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  WITH paid AS (SELECT * FROM public.bookings WHERE paid_at IS NOT NULL OR status IN ('confirmed','released','completed','awaiting_host')),
  cur AS (SELECT * FROM paid WHERE created_at::date BETWEEN _from AND _to),
  prev AS (SELECT * FROM paid WHERE created_at::date BETWEEN pf AND pt),
  started AS (SELECT * FROM public.bookings WHERE created_at::date BETWEEN _from AND _to),
  ao AS (SELECT * FROM public.addon_orders WHERE status IN ('paid','needs_attention','confirmed','done'))
  SELECT jsonb_build_object(
    'current', jsonb_build_object('bookings', (SELECT count(*) FROM cur), 'gross', (SELECT coalesce(sum(total_price),0) FROM cur),
       'fees', (SELECT coalesce(sum(coalesce(fee_kobo,0) + coalesce(markup_kobo,0)),0)/100.0 FROM cur),
       'addons', (SELECT coalesce(sum(amount_kobo),0)/100.0 FROM ao WHERE paid_at::date BETWEEN _from AND _to),
       'host_payouts', (SELECT coalesce(sum(host_payout_kobo),0)/100.0 FROM cur), 'nights', (SELECT coalesce(sum(check_out_date - check_in_date),0) FROM cur)),
    'previous', jsonb_build_object('bookings', (SELECT count(*) FROM prev), 'gross', (SELECT coalesce(sum(total_price),0) FROM prev),
       'fees', (SELECT coalesce(sum(coalesce(fee_kobo,0) + coalesce(markup_kobo,0)),0)/100.0 FROM prev),
       'addons', (SELECT coalesce(sum(amount_kobo),0)/100.0 FROM ao WHERE paid_at::date BETWEEN pf AND pt),
       'host_payouts', (SELECT coalesce(sum(host_payout_kobo),0)/100.0 FROM prev), 'nights', (SELECT coalesce(sum(check_out_date - check_in_date),0) FROM prev)),
    'funnel', jsonb_build_object('started', (SELECT count(*) FROM started),
       'paid', (SELECT count(*) FROM started WHERE paid_at IS NOT NULL OR status IN ('confirmed','released','completed','awaiting_host')),
       'cancelled', (SELECT count(*) FROM started WHERE status IN ('cancelled','refunded','declined')),
       'abandoned', (SELECT count(*) FROM started WHERE status = 'expired')),
    'by_day', (SELECT coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'bookings', (SELECT count(*) FROM cur WHERE created_at::date = d::date), 'gross', (SELECT coalesce(sum(total_price),0) FROM cur WHERE created_at::date = d::date)) ORDER BY d), '[]')
               FROM generate_series(_from, _to, interval '1 day') d),
    'by_source', (SELECT coalesce(jsonb_object_agg(source, n), '{}') FROM (SELECT source, count(*) n FROM cur GROUP BY source) s)
  ) INTO j;
  RETURN j;
END $function$;