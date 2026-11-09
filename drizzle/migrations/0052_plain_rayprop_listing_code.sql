CREATE OR REPLACE FUNCTION public.set_booking_listing_code() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.listing_code IS NULL THEN
    IF NEW.listing_id IS NOT NULL THEN
      SELECT listing_code INTO NEW.listing_code FROM public.listings WHERE id = NEW.listing_id;
    ELSIF NEW.rayprop_listing_id IS NOT NULL THEN
      NEW.listing_code := regexp_replace(NEW.rayprop_listing_id, '^(rp_|RP-)', '');
    END IF;
  END IF;
  RETURN NEW;
END; $$;
UPDATE public.bookings SET listing_code = substring(listing_code from 4) WHERE listing_code LIKE 'RP-%';