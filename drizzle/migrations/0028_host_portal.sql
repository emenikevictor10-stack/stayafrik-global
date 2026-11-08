CREATE OR REPLACE FUNCTION public.confirm_local_payment(_reference text, _amount_kobo bigint) RETURNS bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE b public.bookings; _mode text; _next text;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE payment_reference = _reference FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No booking for this payment' USING ERRCODE = 'no_data_found'; END IF;
  IF b.status NOT IN ('held','expired','pending') THEN RETURN b; END IF;
  PERFORM set_config('app.actor', 'system', true);
  PERFORM public.log_booking_event(b.id, 'payment_received', 'system', jsonb_build_object('amount_kobo', _amount_kobo, 'reference', _reference));
  IF round(b.total_price * 100) <> _amount_kobo THEN
    UPDATE public.bookings SET status = 'needs_attention', paid_at = now(),
      attention_reason = format('Paid %s kobo, expected %s', _amount_kobo, round(b.total_price * 100))
      WHERE id = b.id RETURNING * INTO b;
    PERFORM public.notify_admins('Booking payment mismatch', b.attention_reason, '/admin/bookings');
    RETURN b;
  END IF;
  SELECT booking_mode INTO _mode FROM public.listings WHERE id = b.listing_id;
  _next := CASE WHEN _mode = 'request' THEN 'awaiting_host' ELSE 'confirmed' END;
  BEGIN
    UPDATE public.bookings SET status = _next, paid_at = now(),
      host_respond_by = CASE WHEN _next = 'awaiting_host' THEN now() + make_interval(hours => public.setting_int('host_accept_hours', 24)) END
      WHERE id = b.id RETURNING * INTO b;
    IF _next = 'awaiting_host' AND b.host_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (b.host_id, 'booking_request', 'New booking request', 'A guest has paid and is waiting for you to accept. Reply within ' || public.setting_int('host_accept_hours', 24) || ' hours.', '/host/requests');
    END IF;
  EXCEPTION WHEN exclusion_violation THEN
    UPDATE public.bookings SET status = 'needs_attention', paid_at = now(),
      attention_reason = 'Paid after the hold expired and the nights were taken'
      WHERE id = b.id RETURNING * INTO b;
    PERFORM public.notify_admins('Paid booking needs attention', 'Guest paid after their hold expired and the nights were taken. Refund or move them.', '/admin/bookings');
  END;
  RETURN b;
END $function$;

-- Guest names for a host's bookings: first name only until confirmed; phone only once confirmed.
CREATE OR REPLACE FUNCTION public.host_booking_guests(_booking_ids uuid[])
RETURNS TABLE(booking_id uuid, guest_name text, guest_phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT b.id,
    CASE WHEN b.status IN ('confirmed','released','completed') THEN coalesce(nullif(trim(p.full_name),''),'Guest')
         ELSE coalesce(nullif(split_part(trim(p.full_name),' ',1),''),'Guest') END,
    CASE WHEN b.status IN ('confirmed','released','completed') THEN p.phone END
  FROM public.bookings b LEFT JOIN public.profiles p ON p.user_id = b.guest_id
  WHERE b.id = ANY(_booking_ids) AND (b.host_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
$function$;
REVOKE ALL ON FUNCTION public.host_booking_guests(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.host_booking_guests(uuid[]) TO authenticated;