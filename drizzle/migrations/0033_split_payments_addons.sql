-- ===== Split payments: each traveller pays a share; booking confirms only when all shares are paid =====
CREATE TABLE public.payment_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  share_no int NOT NULL CHECK (share_no >= 1),
  amount_kobo bigint NOT NULL CHECK (amount_kobo > 0),
  token text NOT NULL UNIQUE,
  payer_user_id uuid,
  label text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','refunded','refund_failed','void')),
  reference text UNIQUE,
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, share_no)
);
GRANT SELECT ON public.payment_shares TO authenticated;
GRANT ALL ON public.payment_shares TO service_role;
ALTER TABLE public.payment_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead guest, payer or admin read shares" ON public.payment_shares FOR SELECT TO authenticated USING (
  payer_user_id = auth.uid() OR private.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.guest_id = auth.uid()));

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_split boolean NOT NULL DEFAULT false;

-- Public facts for an invite link (no personal data beyond the lead's first name).
CREATE OR REPLACE FUNCTION public.get_payment_share(_token text)
RETURNS TABLE(share_id uuid, booking_id uuid, amount_kobo bigint, status text, booking_status text, title text, city text,
              check_in date, check_out date, lead_first_name text, shares_total int, shares_paid int, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, b.id, s.amount_kobo, s.status, b.status, coalesce(l.title, b.partner_title), coalesce(l.city, b.partner_city),
         b.check_in_date, b.check_out_date, split_part(coalesce(p.full_name, 'A friend'), ' ', 1),
         (SELECT count(*)::int FROM public.payment_shares x WHERE x.booking_id = b.id AND x.status <> 'void'),
         (SELECT count(*)::int FROM public.payment_shares x WHERE x.booking_id = b.id AND x.status = 'paid'),
         b.hold_expires_at
  FROM public.payment_shares s JOIN public.bookings b ON b.id = s.booking_id
  LEFT JOIN public.listings l ON l.id = b.listing_id
  LEFT JOIN public.profiles p ON p.user_id = b.guest_id
  WHERE char_length(coalesce(_token,'')) >= 16 AND s.token = _token
$$;
GRANT EXECUTE ON FUNCTION public.get_payment_share(text) TO anon, authenticated;

-- Called by verify/webhook (service role) when a share's Paystack payment succeeds. Idempotent.
CREATE OR REPLACE FUNCTION public.record_share_payment(_reference text, _amount_kobo bigint, _payer uuid)
RETURNS public.bookings LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.payment_shares; b public.bookings; unpaid int;
BEGIN
  SELECT * INTO s FROM public.payment_shares WHERE reference = _reference FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No share for this payment' USING ERRCODE = 'no_data_found'; END IF;
  SELECT * INTO b FROM public.bookings WHERE id = s.booking_id FOR UPDATE;
  IF s.status = 'paid' THEN RETURN b; END IF;
  UPDATE public.payment_shares SET status = 'paid', paid_at = now(), payer_user_id = coalesce(payer_user_id, _payer) WHERE id = s.id;
  PERFORM set_config('app.actor', 'system', true);
  PERFORM public.log_booking_event(b.id, 'share_paid', 'system', jsonb_build_object('share_no', s.share_no, 'amount_kobo', _amount_kobo, 'reference', _reference));
  IF _amount_kobo <> s.amount_kobo THEN
    UPDATE public.bookings SET status = 'needs_attention', attention_reason = format('Share %s paid %s kobo, expected %s', s.share_no, _amount_kobo, s.amount_kobo)
      WHERE id = b.id AND status IN ('held','expired','pending') RETURNING * INTO b;
    PERFORM public.notify_admins('Split payment mismatch', format('Share %s on booking %s paid the wrong amount', s.share_no, b.id), '/admin/payments');
    RETURN b;
  END IF;
  SELECT count(*) INTO unpaid FROM public.payment_shares WHERE booking_id = b.id AND status = 'pending';
  IF unpaid = 0 THEN
    RETURN public.confirm_local_payment(b.payment_reference, round(b.total_price * 100)::bigint);
  END IF;
  RETURN b;
END $$;
REVOKE ALL ON FUNCTION public.record_share_payment(text, bigint, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_share_payment(text, bigint, uuid) TO service_role;

-- ===== Add-ons: extras guests buy for a confirmed trip; staff arrange them =====
CREATE TABLE public.addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  description text CHECK (description IS NULL OR char_length(description) <= 300),
  price_kobo bigint NOT NULL CHECK (price_kobo > 0),
  unit text NOT NULL DEFAULT 'each' CHECK (char_length(unit) <= 20),
  active boolean NOT NULL DEFAULT true,
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.addons TO anon, authenticated;
GRANT INSERT, UPDATE ON public.addons TO authenticated;
GRANT ALL ON public.addons TO service_role;
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads active add-ons" ON public.addons FOR SELECT TO anon, authenticated USING (active OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert add-ons" ON public.addons FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update add-ons" ON public.addons FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE TABLE public.addon_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL,
  addon_id uuid NOT NULL REFERENCES public.addons(id),
  addon_name text NOT NULL,
  qty int NOT NULL CHECK (qty BETWEEN 1 AND 20),
  amount_kobo bigint NOT NULL CHECK (amount_kobo > 0),
  note text CHECK (note IS NULL OR char_length(note) <= 300),
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment','paid','arranged','cancelled','refunded','needs_attention')),
  reference text UNIQUE,
  paid_at timestamptz,
  arranged_by uuid,
  arranged_at timestamptz,
  staff_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.addon_orders TO authenticated;
GRANT ALL ON public.addon_orders TO service_role;
ALTER TABLE public.addon_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guest or admin reads add-on orders" ON public.addon_orders FOR SELECT TO authenticated
  USING (guest_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.confirm_addon_payment(_reference text, _amount_kobo bigint)
RETURNS public.addon_orders LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.addon_orders;
BEGIN
  SELECT * INTO o FROM public.addon_orders WHERE reference = _reference FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No add-on order for this payment' USING ERRCODE = 'no_data_found'; END IF;
  IF o.status <> 'pending_payment' THEN RETURN o; END IF;
  IF _amount_kobo <> o.amount_kobo THEN
    UPDATE public.addon_orders SET status = 'needs_attention', paid_at = now(), staff_note = format('Paid %s kobo, expected %s', _amount_kobo, o.amount_kobo) WHERE id = o.id RETURNING * INTO o;
  ELSE
    UPDATE public.addon_orders SET status = 'paid', paid_at = now() WHERE id = o.id RETURNING * INTO o;
  END IF;
  PERFORM public.log_booking_event(o.booking_id, 'addon_paid', 'system', jsonb_build_object('addon', o.addon_name, 'qty', o.qty, 'amount_kobo', _amount_kobo));
  PERFORM public.notify_admins('Add-on to arrange', o.addon_name || ' x' || o.qty, '/admin/addons');
  RETURN o;
END $$;
REVOKE ALL ON FUNCTION public.confirm_addon_payment(text, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_addon_payment(text, bigint) TO service_role;

CREATE OR REPLACE FUNCTION public.staff_addon_action(_order_id uuid, _action text, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.addon_orders;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO o FROM public.addon_orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _action = 'arranged' AND o.status IN ('paid','needs_attention') THEN
    UPDATE public.addon_orders SET status = 'arranged', arranged_by = auth.uid(), arranged_at = now(), staff_note = coalesce(left(_note,300), staff_note) WHERE id = o.id;
    INSERT INTO public.notifications(user_id, type, title, body, link) VALUES (o.guest_id, 'booking', o.addon_name || ' is arranged', coalesce(_note,''), '/trips/' || o.booking_id);
  ELSIF _action = 'cancelled' AND o.status IN ('pending_payment') THEN
    UPDATE public.addon_orders SET status = 'cancelled', staff_note = left(_note,300) WHERE id = o.id;
  ELSE RAISE EXCEPTION 'That action is not possible for this order';
  END IF;
  INSERT INTO public.admin_audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'addon_' || _action, 'addon_order', o.id::text, jsonb_build_object('note', _note));
END $$;
GRANT EXECUTE ON FUNCTION public.staff_addon_action(uuid, text, text) TO authenticated;