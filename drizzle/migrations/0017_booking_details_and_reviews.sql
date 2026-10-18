ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS partner_address text, ADD COLUMN IF NOT EXISTS check_in_time text, ADD COLUMN IF NOT EXISTS review_prompted_at timestamptz;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS reviews_booking_unique ON public.reviews(booking_id);

DROP POLICY IF EXISTS "Guests insert own reviews" ON public.reviews;
CREATE POLICY "Guests insert own reviews" ON public.reviews FOR INSERT TO authenticated
WITH CHECK (auth.uid() = guest_id AND rating BETWEEN 1 AND 5 AND hidden = false AND EXISTS (
  SELECT 1 FROM public.bookings b WHERE b.id = reviews.booking_id AND b.guest_id = auth.uid()
   AND b.listing_id = reviews.listing_id AND b.check_out_date <= current_date
   AND b.status IN ('confirmed','released','completed')));
DROP POLICY IF EXISTS "Reviews viewable by authenticated" ON public.reviews;
CREATE POLICY "Visible reviews are public" ON public.reviews FOR SELECT TO anon, authenticated
USING (hidden = false OR auth.uid() = guest_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update reviews" ON public.reviews FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;

CREATE OR REPLACE FUNCTION public.recalc_listing_rating() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _l uuid := COALESCE(NEW.listing_id, OLD.listing_id);
BEGIN
  UPDATE public.listings SET
    rating = COALESCE((SELECT round(avg(rating)::numeric,2) FROM public.reviews WHERE listing_id=_l AND NOT hidden),0),
    reviews_count = (SELECT count(*) FROM public.reviews WHERE listing_id=_l AND NOT hidden)
  WHERE id=_l;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS reviews_recalc ON public.reviews;
CREATE TRIGGER reviews_recalc AFTER INSERT OR UPDATE OR DELETE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.recalc_listing_rating();

-- Guest booking confirmation for local stays
CREATE OR REPLACE FUNCTION public.notify_on_booking() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE l record; _addr text; _host_name text;
BEGIN
  IF NEW.listing_id IS NULL THEN RETURN NEW; END IF;
  SELECT host_id, title, address, neighborhood, city, state, listing_code INTO l FROM public.listings WHERE id = NEW.listing_id;
  IF l.host_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (l.host_id, 'booking', 'New booking request', 'A guest booked: ' || COALESCE(l.title,'your listing'), '/escrow');
    PERFORM public.send_alert_email(l.host_id, 'New booking on StayGlobal', 'You have a new booking',
      'A guest just booked <strong>' || COALESCE(l.title,'your listing') || '</strong>. Come online to confirm the details and chat with your guest.', '/escrow');
  END IF;
  IF NEW.status = 'confirmed' THEN
    _addr := concat_ws(', ', NULLIF(l.address,''), NULLIF(l.neighborhood,''), NULLIF(l.city,''), NULLIF(l.state,''));
    SELECT split_part(COALESCE(full_name,'your host'),' ',1) INTO _host_name FROM public.profiles WHERE user_id = l.host_id;
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (NEW.guest_id, 'booking', 'Booking confirmed', COALESCE(l.title,'Your stay') || ' · ' || NEW.check_in_date || ' to ' || NEW.check_out_date, '/bookings');
    PERFORM public.send_alert_email(NEW.guest_id, 'Your StayGlobal booking is confirmed', 'Booking confirmed',
      '<strong>' || replace(COALESCE(l.title,'Your stay'),'<','&lt;') || '</strong> (Listing ID ' || COALESCE(l.listing_code,'') || ')<br/><br/>'
      || '<strong>Address:</strong> ' || replace(COALESCE(NULLIF(_addr,''),'Shared in your trip page'),'<','&lt;') || '<br/>'
      || '<a href="https://www.google.com/maps/search/?api=1&query=' || replace(COALESCE(_addr,''),' ','+') || '" style="color:#e0b64c">Get directions</a><br/><br/>'
      || '<strong>Check-in:</strong> ' || NEW.check_in_date || ' (from 2:00 PM)<br/><strong>Check-out:</strong> ' || NEW.check_out_date || ' (by 12:00 PM)<br/>'
      || '<strong>Nights:</strong> ' || (NEW.check_out_date - NEW.check_in_date) || ' · <strong>Guests:</strong> ' || COALESCE(NEW.guest_count, 1) || '<br/>'
      || '<strong>Paid:</strong> ₦' || to_char(NEW.total_price,'FM999,999,999') || ' · <strong>Ref:</strong> ' || COALESCE(NEW.payment_reference,'') || '<br/><br/>'
      || 'Your host is ' || COALESCE(_host_name,'your host') || ' — message them in the app.<br/><br/>'
      || '<span style="font-size:12px">Cancellation: full refund 48h+ before check-in, 50% within 48h, none after check-in. Help: support@stayglobal.app</span>',
      '/bookings');
  END IF;
  RETURN NEW;
END; $function$;

-- Review prompts after check-out
CREATE OR REPLACE FUNCTION public.queue_review_prompts() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b record; n int := 0;
BEGIN
  FOR b IN SELECT bk.id, bk.guest_id, l.title FROM public.bookings bk JOIN public.listings l ON l.id = bk.listing_id
    WHERE bk.review_prompted_at IS NULL AND bk.check_out_date <= current_date AND bk.check_out_date > current_date - 30
      AND bk.status IN ('confirmed','released','completed')
      AND NOT EXISTS (SELECT 1 FROM public.reviews r WHERE r.booking_id = bk.id) LIMIT 200
  LOOP
    UPDATE public.bookings SET review_prompted_at = now() WHERE id = b.id;
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (b.guest_id, 'review', 'How was your stay?', 'Rate ' || COALESCE(b.title,'your stay'), '/bookings');
    PERFORM public.send_alert_email(b.guest_id, 'How was your stay?', 'Rate your stay',
      'Tell us about <strong>' || replace(COALESCE(b.title,'your stay'),'<','&lt;') || '</strong>. Your review helps other guests.', '/bookings');
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.queue_review_prompts() FROM PUBLIC, anon, authenticated;