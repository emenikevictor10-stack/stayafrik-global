CREATE OR REPLACE FUNCTION public.listing_booked_ranges(_listing_id uuid)
RETURNS TABLE(check_in date, check_out date) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.check_in_date, b.check_out_date FROM public.bookings b
  WHERE b.listing_id = _listing_id
    AND (b.status IN ('confirmed','released','needs_attention') OR (b.status = 'held' AND b.hold_expires_at > now()))
    AND b.check_out_date >= CURRENT_DATE ORDER BY b.check_in_date;
$$;

-- Expire stale holds on one stay right away (used before taking a new hold).
CREATE OR REPLACE FUNCTION public.expire_stale_holds(_listing_id uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  PERFORM set_config('app.actor', 'system', true);
  WITH u AS (UPDATE public.bookings SET status = 'expired'
    WHERE listing_id = _listing_id AND status = 'held' AND hold_expires_at < now() RETURNING 1)
  SELECT count(*) INTO n FROM u;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.expire_stale_holds(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_holds(uuid) TO service_role;