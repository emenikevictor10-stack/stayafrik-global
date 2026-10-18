CREATE EXTENSION IF NOT EXISTS fuzzystrmatch WITH SCHEMA extensions;

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
        WHEN length(n.t) >= 4 AND levenshtein(left(public.loc_norm(l.name), 40), left(n.t, 40)) <= CASE WHEN length(n.t) >= 7 THEN 2 ELSE 1 END THEN 25
        WHEN length(n.t) >= 4 AND levenshtein(left(public.loc_norm(l.name), length(n.t)), n.t) <= 1 AND length(l.name) > length(n.t) THEN 22
        ELSE 0
      END::numeric AS r
    FROM public.locations l, n
    WHERE l.is_active AND length(n.t) >= 2
  ),
  hits AS (SELECT * FROM scored WHERE r > 0),
  -- a strongly matched city also brings its busiest neighbourhoods ("abu" → Abuja, then Wuse 2, Jahi…)
  kids AS (
    SELECT c.*, 10::numeric AS r2 FROM public.locations c
    WHERE c.is_active AND c.type = 'neighbourhood'
      AND c.parent_id IN (SELECT h.id FROM hits h WHERE h.type = 'city' AND h.r >= 80)
      AND c.id NOT IN (SELECT h.id FROM hits h)
  ),
  allr AS (
    SELECT id, name, slug, type, parent_id, listing_count, r FROM hits
    UNION ALL
    SELECT id, name, slug, type, parent_id, listing_count, r2 FROM kids
  )
  SELECT s.id, s.name, s.slug, s.type,
    concat_ws(', ', p.name, gp.name) AS breadcrumb,
    s.listing_count, s.r
  FROM allr s
  LEFT JOIN public.locations p ON p.id = s.parent_id
  LEFT JOIN public.locations gp ON gp.id = p.parent_id
  WHERE _include_empty OR s.listing_count > 0
  ORDER BY s.r DESC, s.listing_count DESC,
    CASE s.type WHEN 'state' THEN 1 ELSE 0 END, s.name
  LIMIT least(greatest(_limit, 1), 20);
$$;
GRANT EXECUTE ON FUNCTION public.search_locations(text, integer, boolean) TO anon, authenticated;