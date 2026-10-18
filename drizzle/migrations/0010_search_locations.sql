CREATE OR REPLACE FUNCTION public.search_locations(q text, _limit integer DEFAULT 8, _include_empty boolean DEFAULT false)
RETURNS TABLE(id uuid, name text, slug text, type text, breadcrumb text, listing_count integer, rank numeric)
LANGUAGE sql STABLE SET search_path = public, extensions AS $$
  WITH n AS (SELECT public.loc_norm(q) AS t),
  scored AS (
    SELECT l.*,
      CASE
        WHEN public.loc_norm(l.name) = n.t THEN 100
        WHEN public.loc_norm(l.name) LIKE n.t || '%' THEN 80
        WHEN (' ' || public.loc_norm(l.name)) LIKE '% ' || n.t || '%' THEN 60
        WHEN EXISTS (SELECT 1 FROM unnest(l.aliases) a WHERE public.loc_norm(a) = n.t) THEN 55
        WHEN EXISTS (SELECT 1 FROM unnest(l.aliases) a WHERE public.loc_norm(a) LIKE n.t || '%') THEN 45
        WHEN length(n.t) >= 4 AND similarity(public.loc_norm(l.name), n.t) >= 0.3 THEN 20 + similarity(public.loc_norm(l.name), n.t) * 20
        ELSE 0
      END::numeric AS r
    FROM public.locations l, n
    WHERE l.is_active AND length(n.t) >= 2
  )
  SELECT s.id, s.name, s.slug, s.type,
    concat_ws(', ', p.name, gp.name) AS breadcrumb,
    s.listing_count, s.r
  FROM scored s
  LEFT JOIN public.locations p ON p.id = s.parent_id
  LEFT JOIN public.locations gp ON gp.id = p.parent_id
  WHERE s.r > 0 AND (_include_empty OR s.listing_count > 0)
  ORDER BY s.r DESC, s.listing_count DESC,
    CASE s.type WHEN 'state' THEN 1 ELSE 0 END, s.name
  LIMIT least(greatest(_limit, 1), 20);
$$;

CREATE OR REPLACE FUNCTION public.popular_locations(_limit integer DEFAULT 6)
RETURNS TABLE(id uuid, name text, slug text, type text, breadcrumb text, listing_count integer)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT l.id, l.name, l.slug, l.type, concat_ws(', ', p.name, gp.name), l.listing_count
  FROM public.locations l
  LEFT JOIN public.locations p ON p.id = l.parent_id
  LEFT JOIN public.locations gp ON gp.id = p.parent_id
  WHERE l.is_active AND l.type <> 'state' AND l.listing_count > 0
  ORDER BY l.listing_count DESC, l.name
  LIMIT least(greatest(_limit, 1), 20);
$$;

CREATE OR REPLACE FUNCTION public.search_stays(q text, _limit integer DEFAULT 3)
RETURNS TABLE(kind text, id text, title text, subtitle text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH n AS (SELECT public.loc_norm(q) AS t)
  SELECT * FROM (
    SELECT 'local'::text, l.id::text, l.title, concat_ws(', ', l.neighborhood, l.city)
    FROM public.listings l, n
    WHERE l.verified AND l.is_available AND length(n.t) >= 3 AND public.loc_norm(l.title) LIKE '%' || n.t || '%'
    UNION ALL
    SELECT 'partner', 'rp_' || m.rayprop_listing_id, m.title,
      concat_ws(', ', (SELECT name FROM public.locations WHERE id = coalesce(m.neighbourhood_id, m.city_id)),
                      (SELECT name FROM public.locations WHERE id = m.state_id))
    FROM public.partner_location_map m, n
    WHERE length(n.t) >= 3 AND m.title IS NOT NULL AND public.loc_norm(m.title) LIKE '%' || n.t || '%'
  ) x
  LIMIT least(greatest(_limit, 1), 10);
$$;

GRANT EXECUTE ON FUNCTION public.search_locations(text, integer, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.popular_locations(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_stays(text, integer) TO anon, authenticated;