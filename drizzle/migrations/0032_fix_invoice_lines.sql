CREATE OR REPLACE FUNCTION public.issue_invoice(_booking_id uuid, _company text, _tax_id text)
RETURNS public.invoices LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.bookings; k text; inv public.invoices; ls jsonb;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
  IF b.id IS NULL OR (b.guest_id <> auth.uid() AND NOT private.has_role(auth.uid(), 'admin')) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  k := CASE WHEN b.status IN ('confirmed','released','completed','awaiting_host','needs_attention','processing') OR b.paid_at IS NOT NULL THEN 'paid'
            WHEN b.status IN ('held','pending') THEN 'proforma' ELSE NULL END;
  IF k IS NULL THEN RAISE EXCEPTION 'No invoice for this booking status'; END IF;
  SELECT coalesce(jsonb_agg(x) FILTER (WHERE x IS NOT NULL), '[]') INTO ls FROM (VALUES
    (jsonb_build_object('label', 'Stay ' || b.check_in_date || ' to ' || b.check_out_date,
       'kobo', coalesce(b.subtotal_kobo - coalesce(b.cleaning_fee_kobo,0) + coalesce(b.discount_kobo,0), round(b.total_price*100)))),
    (CASE WHEN coalesce(b.discount_kobo,0) > 0 THEN jsonb_build_object('label','Discount','kobo', -b.discount_kobo) END),
    (CASE WHEN coalesce(b.cleaning_fee_kobo,0) > 0 THEN jsonb_build_object('label','Cleaning fee','kobo', b.cleaning_fee_kobo) END),
    (CASE WHEN coalesce(b.fee_kobo,0) > 0 THEN jsonb_build_object('label','Service fee','kobo', b.fee_kobo) END)
  ) v(x);
  INSERT INTO public.invoices(number, booking_id, guest_id, kind, company_name, tax_id, amount, lines)
  VALUES ('SG-INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0'),
          b.id, b.guest_id, k, nullif(btrim(_company), ''), nullif(btrim(_tax_id), ''), b.total_price, ls)
  ON CONFLICT (booking_id, kind) DO UPDATE SET company_name = coalesce(EXCLUDED.company_name, invoices.company_name),
    tax_id = coalesce(EXCLUDED.tax_id, invoices.tax_id), lines = EXCLUDED.lines, amount = EXCLUDED.amount
  RETURNING * INTO inv;
  RETURN inv;
END $$;