ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS geo_status text;
COMMENT ON COLUMN public.locations.geo_status IS 'auto = filled by map lookup, review = lookup unsure (needs a person), manual = set by staff';

-- Area point for each stay: neighbourhood point, else city point, else state point. Public (only area-level points).
CREATE OR REPLACE FUNCTION public.stay_area_points(_local_ids uuid[], _partner_ids text[])
RETURNS TABLE(stay_id text, lat double precision, lng double precision, level text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH s AS (
    SELECT l.id::text AS stay_id, l.neighbourhood_id n, l.city_id c, l.state_id st FROM public.listings l WHERE l.id = ANY(coalesce(_local_ids, '{}'))
    UNION ALL
    SELECT 'rp_' || m.rayprop_listing_id, m.neighbourhood_id, m.city_id, m.state_id FROM public.partner_location_map m
      WHERE m.rayprop_listing_id = ANY(coalesce(_partner_ids, '{}')) AND m.status IN ('ok','confirmed')
  )
  SELECT s.stay_id,
    coalesce(n.lat, c.lat, st.lat), coalesce(n.lng, c.lng, st.lng),
    CASE WHEN n.lat IS NOT NULL THEN 'neighbourhood' WHEN c.lat IS NOT NULL THEN 'city' WHEN st.lat IS NOT NULL THEN 'state' END
  FROM s
  LEFT JOIN public.locations n ON n.id = s.n AND (n.geo_status IS DISTINCT FROM 'review')
  LEFT JOIN public.locations c ON c.id = s.c AND (c.geo_status IS DISTINCT FROM 'review')
  LEFT JOIN public.locations st ON st.id = s.st AND (st.geo_status IS DISTINCT FROM 'review')
  WHERE coalesce(n.lat, c.lat, st.lat) IS NOT NULL
$$;
GRANT EXECUTE ON FUNCTION public.stay_area_points(uuid[], text[]) TO anon, authenticated;