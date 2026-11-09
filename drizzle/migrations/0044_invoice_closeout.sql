ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS billed_name text, ADD COLUMN IF NOT EXISTS billed_email text;

CREATE OR REPLACE FUNCTION public.issue_invoice(_booking_id uuid, _company text, _tax_id text)
 RETURNS invoices LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE b public.bookings; k text; inv public.invoices; ls jsonb; extras jsonb; extra_total bigint; pn text; pe text; num text;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
  IF b.id IS NULL OR (b.guest_id <> auth.uid() AND NOT private.has_any_role(auth.uid(), '{admin,support,finance}'::public.app_role[])) THEN RAISE EXCEPTION 'Not allowed'; END IF;
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
  SELECT coalesce(jsonb_agg(jsonb_build_object('label', addon_name || CASE WHEN qty > 1 THEN ' × ' || qty ELSE '' END, 'kobo', amount_kobo) ORDER BY created_at), '[]'),
         coalesce(sum(amount_kobo), 0)
    INTO extras, extra_total FROM public.addon_orders WHERE booking_id = b.id AND status IN ('paid','arranged','completed');
  ls := ls || extras;
  SELECT full_name, email INTO pn, pe FROM public.profiles WHERE user_id = b.guest_id;
  SELECT * INTO inv FROM public.invoices WHERE booking_id = b.id AND kind = k;
  IF inv.id IS NULL THEN
    num := 'SG-INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0');
    INSERT INTO public.invoices(number, booking_id, guest_id, kind, company_name, tax_id, amount, lines, billed_name, billed_email)
    VALUES (num, b.id, b.guest_id, k, nullif(btrim(_company), ''), nullif(btrim(_tax_id), ''), b.total_price + extra_total / 100.0, ls, pn, pe)
    RETURNING * INTO inv;
  ELSE
    UPDATE public.invoices SET
      company_name = CASE WHEN _company IS NULL THEN company_name ELSE nullif(btrim(_company), '') END,
      tax_id = CASE WHEN _tax_id IS NULL THEN tax_id ELSE nullif(btrim(_tax_id), '') END,
      lines = ls, amount = b.total_price + extra_total / 100.0, billed_name = pn, billed_email = pe
    WHERE id = inv.id RETURNING * INTO inv;
  END IF;
  RETURN inv;
END $function$;