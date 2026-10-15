ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS listing_code text UNIQUE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS listing_code text;

CREATE OR REPLACE FUNCTION public.generate_listing_code()
RETURNS text LANGUAGE plpgsql VOLATILE SET search_path TO 'public' AS $$
DECLARE _c text;
BEGIN
  LOOP
    _c := 'SG' || lpad((floor(random()*10000))::int::text, 4, '0')
       || chr(65 + floor(random()*26)::int) || chr(65 + floor(random()*26)::int);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.listings WHERE listing_code = _c);
  END LOOP;
  RETURN _c;
END; $$;

CREATE OR REPLACE FUNCTION public.set_listing_code()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.listing_code IS NULL OR NEW.listing_code = '' THEN
    NEW.listing_code := public.generate_listing_code();
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_set_listing_code BEFORE INSERT ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.set_listing_code();

CREATE OR REPLACE FUNCTION public.set_booking_listing_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.listing_code IS NULL THEN
    IF NEW.listing_id IS NOT NULL THEN
      SELECT listing_code INTO NEW.listing_code FROM public.listings WHERE id = NEW.listing_id;
    ELSIF NEW.rayprop_listing_id IS NOT NULL THEN
      NEW.listing_code := 'RP-' || NEW.rayprop_listing_id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_set_booking_listing_code BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.set_booking_listing_code();

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT id FROM public.listings WHERE listing_code IS NULL LOOP
    UPDATE public.listings SET listing_code = public.generate_listing_code() WHERE id = r.id;
  END LOOP;
END $$;

UPDATE public.bookings b SET listing_code = l.listing_code FROM public.listings l
WHERE b.listing_id = l.id AND b.listing_code IS NULL;
UPDATE public.bookings SET listing_code = 'RP-' || rayprop_listing_id
WHERE listing_code IS NULL AND rayprop_listing_id IS NOT NULL;