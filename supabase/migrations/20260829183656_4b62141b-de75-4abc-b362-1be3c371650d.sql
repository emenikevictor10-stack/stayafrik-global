ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'stayglobal',
  ADD COLUMN IF NOT EXISTS rayprop_listing_id text,
  ADD COLUMN IF NOT EXISTS rayprop_quote_id text,
  ADD COLUMN IF NOT EXISTS rayprop_hold_id text,
  ADD COLUMN IF NOT EXISTS rayprop_reservation_id text;

CREATE INDEX IF NOT EXISTS bookings_rayprop_reservation_id_idx
  ON public.bookings (rayprop_reservation_id)
  WHERE rayprop_reservation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS bookings_source_idx
  ON public.bookings (source);