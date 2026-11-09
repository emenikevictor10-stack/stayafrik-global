CREATE TABLE public.bank_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  guest_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'stayglobal',
  amount_kobo bigint NOT NULL,
  reference text NOT NULL UNIQUE,
  title text,
  check_in date,
  check_out date,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  sender_name text,
  receipt_path text,
  status text NOT NULL DEFAULT 'awaiting_proof' CHECK (status IN ('awaiting_proof','submitted','approved','rejected','expired')),
  reject_reason text,
  decided_by uuid,
  decided_at timestamptz,
  submitted_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bank_transfers TO authenticated;
GRANT ALL ON public.bank_transfers TO service_role;
ALTER TABLE public.bank_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or staff read transfers" ON public.bank_transfers FOR SELECT TO authenticated
  USING (guest_id = auth.uid() OR private.has_any_role(auth.uid(), ARRAY['admin','finance','support']::public.app_role[]));
CREATE INDEX bank_transfers_status_idx ON public.bank_transfers(status, created_at DESC);

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
  IF t.booking_id IS NOT NULL THEN
    UPDATE public.bookings SET hold_expires_at = now() + interval '7 days', payment_expires_at = now() + interval '7 days'
      WHERE id = t.booking_id AND status = 'held';
  END IF;
  INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (t.guest_id, 'payment', 'Payment being checked', 'We got your transfer receipt and will confirm your booking shortly.', '/bookings');
  INSERT INTO public.notifications(user_id, type, title, body, link)
    SELECT DISTINCT user_id, 'payment', 'Bank transfer to check', coalesce(t.title,'A stay') || ' — ₦' || to_char(t.amount_kobo/100.0, 'FM999,999,999'), '/admin/bank-transfers'
    FROM public.user_roles WHERE role IN ('admin','finance');
END $$;

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
    INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (t.guest_id, 'payment', 'Payment confirmed', 'Your bank transfer was received. Your booking is ' || replace(b.status, '_', ' ') || '.', '/bookings');
    PERFORM public.send_alert_email(t.guest_id, 'Payment received', 'Your bank transfer is confirmed', 'Thanks — we received your transfer for ' || coalesce(t.title,'your stay') || '.', '/bookings');
  ELSE RAISE EXCEPTION 'Unknown action'; END IF;
  INSERT INTO public.admin_audit_log(actor_id, action, entity_type, entity_id, metadata)
    VALUES (auth.uid(), 'bank_transfer_' || _action, 'bank_transfer', _id::text, jsonb_build_object('reference', t.reference, 'reason', _reason, 'amount_kobo', t.amount_kobo));
END $$;

REVOKE ALL ON FUNCTION public.submit_bank_transfer(uuid,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_bank_transfer(uuid,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.staff_bank_transfer_action(uuid,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.staff_bank_transfer_action(uuid,text,text) TO authenticated;

CREATE POLICY "guest uploads own receipt" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'transfer-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "guest or staff read receipt" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'transfer-receipts' AND ((storage.foldername(name))[1] = auth.uid()::text OR private.has_any_role(auth.uid(), ARRAY['admin','finance','support']::public.app_role[])));