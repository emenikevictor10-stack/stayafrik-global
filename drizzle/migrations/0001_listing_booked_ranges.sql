-- Guests can see WHICH nights of a listing are taken, without seeing WHO booked them.
-- Returns only date ranges for bookings that hold nights (anything not cancelled/refunded/failed).
CREATE OR REPLACE FUNCTION public.listing_booked_ranges(_listing_id uuid)
RETURNS TABLE (check_in date, check_out date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.check_in_date, b.check_out_date
  FROM public.bookings b
  WHERE b.listing_id = _listing_id
    AND b.status NOT IN ('cancelled', 'refunded', 'failed')
    AND b.check_out_date >= CURRENT_DATE
  ORDER BY b.check_in_date;
$$;

GRANT EXECUTE ON FUNCTION public.listing_booked_ranges(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listing_booked_ranges(uuid) TO service_role;