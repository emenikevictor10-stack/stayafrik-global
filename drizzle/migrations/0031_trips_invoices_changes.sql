-- Move-dates requests from guests (staff decide).
CREATE TABLE public.booking_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL,
  new_check_in date NOT NULL,
  new_check_out date NOT NULL,
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined','withdrawn')),
  staff_note text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (new_check_out > new_check_in)
);
GRANT SELECT, INSERT ON public.booking_change_requests TO authenticated;
GRANT ALL ON public.booking_change_requests TO service_role;
ALTER TABLE public.booking_change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guest reads own change requests" ON public.booking_change_requests FOR SELECT TO authenticated
  USING (guest_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "guest asks for own booking" ON public.booking_change_requests FOR INSERT TO authenticated
  WITH CHECK (guest_id = auth.uid() AND status = 'pending' AND EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.guest_id = auth.uid()
      AND b.status IN ('confirmed','awaiting_host','needs_attention')));

CREATE OR REPLACE FUNCTION public.staff_change_request_action(_id uuid, _action text, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.booking_change_requests;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _action NOT IN ('approved','declined') THEN RAISE EXCEPTION 'Bad action'; END IF;
  SELECT * INTO r FROM public.booking_change_requests WHERE id = _id FOR UPDATE;
  IF r.id IS NULL OR r.status <> 'pending' THEN RAISE EXCEPTION 'Request is not pending'; END IF;
  UPDATE public.booking_change_requests SET status = _action, staff_note = left(_note, 500), decided_by = auth.uid(), decided_at = now() WHERE id = _id;
  PERFORM public.log_booking_event(r.booking_id, 'change_request_' || _action, 'staff',
    jsonb_build_object('new_check_in', r.new_check_in, 'new_check_out', r.new_check_out, 'note', _note));
  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (r.guest_id, 'booking', CASE WHEN _action = 'approved' THEN 'Date change approved' ELSE 'Date change declined' END,
          coalesce(_note, ''), '/trips/' || r.booking_id);
  INSERT INTO public.admin_audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'change_request_' || _action, 'booking', r.booking_id::text, jsonb_build_object('request', _id, 'note', _note));
END $$;
GRANT EXECUTE ON FUNCTION public.staff_change_request_action(uuid, text, text) TO authenticated;

-- Invoices: proforma (before paying) and paid (after), running numbers.
CREATE SEQUENCE public.invoice_number_seq START 1001;
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('proforma','paid')),
  company_name text CHECK (company_name IS NULL OR char_length(company_name) <= 120),
  tax_id text CHECK (tax_id IS NULL OR char_length(tax_id) <= 40),
  amount numeric NOT NULL,
  lines jsonb NOT NULL DEFAULT '[]',
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, kind)
);
GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guest reads own invoices" ON public.invoices FOR SELECT TO authenticated
  USING (guest_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.issue_invoice(_booking_id uuid, _company text, _tax_id text)
RETURNS public.invoices LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.bookings; k text; inv public.invoices; ls jsonb;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
  IF b.id IS NULL OR (b.guest_id <> auth.uid() AND NOT private.has_role(auth.uid(), 'admin')) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  k := CASE WHEN b.status IN ('confirmed','released','completed','awaiting_host','needs_attention','processing') OR b.paid_at IS NOT NULL THEN 'paid'
            WHEN b.status IN ('held','pending') THEN 'proforma' ELSE NULL END;
  IF k IS NULL THEN RAISE EXCEPTION 'No invoice for this booking status'; END IF;
  ls := jsonb_strip_nulls(jsonb_build_array(
    jsonb_build_object('label', 'Stay ' || b.check_in_date || ' to ' || b.check_out_date, 'kobo', coalesce(b.subtotal_kobo - coalesce(b.cleaning_fee_kobo,0) + coalesce(b.discount_kobo,0), round(b.total_price*100))),
    CASE WHEN coalesce(b.discount_kobo,0) > 0 THEN jsonb_build_object('label','Discount','kobo', -b.discount_kobo) END,
    CASE WHEN coalesce(b.cleaning_fee_kobo,0) > 0 THEN jsonb_build_object('label','Cleaning fee','kobo', b.cleaning_fee_kobo) END,
    CASE WHEN coalesce(b.fee_kobo,0) > 0 THEN jsonb_build_object('label','Service fee','kobo', b.fee_kobo) END
  )) - 'null';
  INSERT INTO public.invoices(number, booking_id, guest_id, kind, company_name, tax_id, amount, lines)
  VALUES ('SG-INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0'),
          b.id, b.guest_id, k, nullif(btrim(_company), ''), nullif(btrim(_tax_id), ''), b.total_price, ls)
  ON CONFLICT (booking_id, kind) DO UPDATE SET company_name = coalesce(EXCLUDED.company_name, invoices.company_name), tax_id = coalesce(EXCLUDED.tax_id, invoices.tax_id)
  RETURNING * INTO inv;
  RETURN inv;
END $$;
GRANT EXECUTE ON FUNCTION public.issue_invoice(uuid, text, text) TO authenticated;

-- "Find my booking" without signing in: reference + email, returns only safe facts.
CREATE OR REPLACE FUNCTION public.find_booking(_reference text, _email text)
RETURNS TABLE(status text, check_in date, check_out date, title text, city text, listing_code text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.status, b.check_in_date, b.check_out_date, coalesce(l.title, b.partner_title), coalesce(l.city, b.partner_city), b.listing_code
  FROM public.bookings b
  JOIN public.profiles p ON p.user_id = b.guest_id
  LEFT JOIN public.listings l ON l.id = b.listing_id
  WHERE char_length(coalesce(_reference,'')) >= 6 AND char_length(coalesce(_email,'')) >= 5
    AND (b.payment_reference = btrim(_reference) OR b.id::text = btrim(_reference))
    AND lower(p.email) = lower(btrim(_email))
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.find_booking(text, text) TO anon, authenticated;