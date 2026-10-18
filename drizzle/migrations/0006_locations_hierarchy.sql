CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  type text NOT NULL CHECK (type IN ('state','city','neighbourhood')),
  parent_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  aliases text[] NOT NULL DEFAULT '{}',
  lat double precision,
  lng double precision,
  is_active boolean NOT NULL DEFAULT true,
  listing_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX locations_name_parent_uniq ON public.locations (lower(name), coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE UNIQUE INDEX locations_slug_uniq ON public.locations (slug);
CREATE INDEX locations_parent_idx ON public.locations (parent_id);
CREATE INDEX locations_name_trgm ON public.locations USING gin (lower(name) extensions.gin_trgm_ops);
GRANT SELECT ON public.locations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read places" ON public.locations FOR SELECT USING (true);
CREATE POLICY "Admins add places" ON public.locations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins edit places" ON public.locations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins remove places" ON public.locations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.listings
  ADD COLUMN state_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN city_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN neighbourhood_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN location_confidence numeric,
  ADD COLUMN location_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN location_suggestion_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN location_raw text;

CREATE TABLE public.partner_location_map (
  rayprop_listing_id text PRIMARY KEY,
  title text,
  state_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  city_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  neighbourhood_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  suggestion_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  confidence numeric,
  status text NOT NULL DEFAULT 'pending',
  raw_state text, raw_city text, raw_neighbourhood text, raw_address text,
  lat double precision, lng double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_location_map TO anon, authenticated;
GRANT ALL ON public.partner_location_map TO service_role;
ALTER TABLE public.partner_location_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read partner places" ON public.partner_location_map FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.loc_norm(t text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT btrim(regexp_replace(lower(coalesce(t,'')), '[^a-z0-9]+', ' ', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.location_chain(_id uuid)
RETURNS TABLE(state_id uuid, city_id uuid, neighbourhood_id uuid)
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE cur uuid := _id; r record;
BEGIN
  WHILE cur IS NOT NULL LOOP
    SELECT id, type, parent_id INTO r FROM public.locations WHERE id = cur;
    EXIT WHEN NOT FOUND;
    IF r.type = 'state' THEN state_id := r.id;
    ELSIF r.type = 'city' THEN city_id := r.id;
    ELSE neighbourhood_id := r.id; END IF;
    cur := r.parent_id;
  END LOOP;
  RETURN NEXT;
END; $$;

CREATE OR REPLACE FUNCTION public.match_location(_state text, _city text, _neigh text, _address text, _lat double precision, _lng double precision)
RETURNS TABLE(state_id uuid, city_id uuid, neighbourhood_id uuid, suggestion_id uuid, confidence numeric, status text)
LANGUAGE plpgsql STABLE SET search_path = public, extensions AS $$
DECLARE r record; best record; second record; n int := 0; conf numeric; pick uuid; ch record;
BEGIN
  FOR r IN
    WITH pieces AS (
      SELECT DISTINCT public.loc_norm(p) AS p
      FROM unnest(ARRAY[_neigh, _city, _state] || string_to_array(coalesce(_address, ''), ',')) p
      WHERE length(public.loc_norm(p)) >= 2
    ), sc AS (
      SELECT l.id, l.name, l.type, l.parent_id, max(
        CASE
          WHEN public.loc_norm(l.name) = pc.p THEN 1.0
          WHEN EXISTS (SELECT 1 FROM unnest(l.aliases) a WHERE public.loc_norm(a) = pc.p) THEN 0.95
          WHEN length(l.name) >= 4 AND (' ' || pc.p || ' ') LIKE ('% ' || public.loc_norm(l.name) || ' %') THEN 0.85
          WHEN EXISTS (SELECT 1 FROM unnest(l.aliases) a WHERE length(a) >= 4 AND (' ' || pc.p || ' ') LIKE ('% ' || public.loc_norm(a) || ' %')) THEN 0.8
          ELSE similarity(public.loc_norm(l.name), pc.p)::numeric
        END) AS s
      FROM public.locations l CROSS JOIN pieces pc
      WHERE l.is_active
      GROUP BY l.id
    )
    SELECT sc.id, sc.name, sc.type,
      sc.s
      + CASE WHEN EXISTS (SELECT 1 FROM sc p1 WHERE p1.id = sc.parent_id AND p1.s >= 0.8) THEN 0.03 ELSE 0 END
      + CASE WHEN EXISTS (SELECT 1 FROM public.locations m JOIN sc p2 ON p2.id = m.parent_id AND p2.s >= 0.8 WHERE m.id = sc.parent_id) THEN 0.03 ELSE 0 END AS f,
      CASE sc.type WHEN 'neighbourhood' THEN 3 WHEN 'city' THEN 2 ELSE 1 END AS depth
    FROM sc WHERE sc.s >= 0.4
    ORDER BY 4 DESC, 5 DESC
    LIMIT 2
  LOOP
    n := n + 1;
    IF n = 1 THEN best := r; ELSE second := r; END IF;
  END LOOP;

  IF n > 0 THEN
    pick := best.id;
    conf := least(best.f, 1.0);
    IF n = 2 AND lower(second.name) = lower(best.name) AND second.f = best.f AND second.depth = best.depth THEN
      conf := 0.55; -- same name in two places, nothing to tell them apart
    END IF;
  END IF;

  IF (pick IS NULL OR conf < 0.6) AND _lat IS NOT NULL AND _lng IS NOT NULL THEN
    SELECT l.id INTO r FROM public.locations l
    WHERE l.is_active AND l.lat IS NOT NULL AND l.type <> 'state'
      AND 111.32 * sqrt(power(l.lat - _lat, 2) + power(cos(radians(_lat)) * (l.lng - _lng), 2)) <= 1.5
    ORDER BY power(l.lat - _lat, 2) + power(cos(radians(_lat)) * (l.lng - _lng), 2) LIMIT 1;
    IF FOUND THEN pick := r.id; conf := 0.7; END IF;
  END IF;

  suggestion_id := pick;
  confidence := round(coalesce(conf, 0), 2);
  IF pick IS NOT NULL THEN
    SELECT * INTO ch FROM public.location_chain(pick);
    IF conf >= 0.6 AND ch.city_id IS NOT NULL THEN
      state_id := ch.state_id; city_id := ch.city_id; neighbourhood_id := ch.neighbourhood_id; status := 'ok';
    ELSE status := 'review'; END IF;
  ELSE status := 'review'; END IF;
  RETURN NEXT;
END; $$;

CREATE OR REPLACE FUNCTION public.listings_location_sync() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m record; ch record;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.state_id IS NOT DISTINCT FROM OLD.state_id AND NEW.city_id IS NOT DISTINCT FROM OLD.city_id
     AND NEW.neighbourhood_id IS NOT DISTINCT FROM OLD.neighbourhood_id
     AND NEW.state IS NOT DISTINCT FROM OLD.state AND NEW.city IS NOT DISTINCT FROM OLD.city
     AND NEW.neighborhood IS NOT DISTINCT FROM OLD.neighborhood AND NEW.address IS NOT DISTINCT FROM OLD.address
  THEN RETURN NEW; END IF;

  IF (TG_OP = 'INSERT' AND coalesce(NEW.neighbourhood_id, NEW.city_id) IS NOT NULL)
     OR (TG_OP = 'UPDATE' AND (NEW.state_id, NEW.city_id, NEW.neighbourhood_id) IS DISTINCT FROM (OLD.state_id, OLD.city_id, OLD.neighbourhood_id)) THEN
    IF coalesce(NEW.neighbourhood_id, NEW.city_id, NEW.state_id) IS NOT NULL THEN
      SELECT * INTO ch FROM public.location_chain(coalesce(NEW.neighbourhood_id, NEW.city_id, NEW.state_id));
      NEW.state_id := ch.state_id; NEW.city_id := ch.city_id; NEW.neighbourhood_id := ch.neighbourhood_id;
    END IF;
  ELSE
    NEW.location_raw := nullif(concat_ws(', ', nullif(NEW.neighborhood, ''), nullif(NEW.city, ''), nullif(NEW.state, ''), nullif(NEW.address, '')), '');
    SELECT * INTO m FROM public.match_location(NEW.state, NEW.city, NEW.neighborhood, NEW.address, NEW.lat, NEW.lng);
    NEW.location_confidence := m.confidence;
    NEW.location_suggestion_id := m.suggestion_id;
    NEW.location_status := m.status;
    NEW.state_id := m.state_id; NEW.city_id := m.city_id; NEW.neighbourhood_id := m.neighbourhood_id;
  END IF;

  IF NEW.state_id IS NOT NULL THEN SELECT name INTO NEW.state FROM public.locations WHERE id = NEW.state_id; END IF;
  IF NEW.city_id IS NOT NULL THEN SELECT name INTO NEW.city FROM public.locations WHERE id = NEW.city_id; END IF;
  IF NEW.neighbourhood_id IS NOT NULL THEN SELECT name INTO NEW.neighborhood FROM public.locations WHERE id = NEW.neighbourhood_id; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_listings_location_sync BEFORE INSERT OR UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.listings_location_sync();

-- Re-run the matcher over every local listing that an admin hasn't confirmed by hand.
CREATE OR REPLACE FUNCTION public.retag_local_listings() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l record; m record; c int := 0; raw_n text; raw_c text; raw_s text;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  FOR l IN SELECT * FROM public.listings WHERE location_status <> 'confirmed' LOOP
    -- match against the original text when we have it, so earlier tidy-ups don't hide the raw value
    SELECT * INTO m FROM public.match_location(l.state, l.city, l.neighborhood, concat_ws(', ', l.location_raw, l.address), l.lat, l.lng);
    UPDATE public.listings SET
      location_raw = coalesce(location_raw, nullif(concat_ws(', ', nullif(neighborhood, ''), nullif(city, ''), nullif(state, ''), nullif(address, '')), '')),
      state_id = m.state_id, city_id = m.city_id, neighbourhood_id = m.neighbourhood_id,
      location_confidence = m.confidence, location_suggestion_id = m.suggestion_id, location_status = m.status
    WHERE id = l.id;
    c := c + 1;
  END LOOP;
  RETURN c;
END; $$;

CREATE OR REPLACE FUNCTION public.tag_partner_locations(_rows jsonb, _force boolean DEFAULT false) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; m record; c int := 0; pid text;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(_rows, '[]'::jsonb)) LOOP
    pid := r->>'id';
    CONTINUE WHEN pid IS NULL;
    IF EXISTS (SELECT 1 FROM public.partner_location_map p WHERE p.rayprop_listing_id = pid
               AND (p.status = 'confirmed' OR NOT _force)) THEN CONTINUE; END IF;
    SELECT * INTO m FROM public.match_location(r->>'state', r->>'city', r->>'neighborhood', r->>'address',
      nullif(r->>'lat', '')::double precision, nullif(r->>'lng', '')::double precision);
    INSERT INTO public.partner_location_map AS p (rayprop_listing_id, title, state_id, city_id, neighbourhood_id, suggestion_id, confidence, status,
      raw_state, raw_city, raw_neighbourhood, raw_address, lat, lng, updated_at)
    VALUES (pid, r->>'title', m.state_id, m.city_id, m.neighbourhood_id, m.suggestion_id, m.confidence, m.status,
      r->>'state', r->>'city', r->>'neighborhood', r->>'address',
      nullif(r->>'lat', '')::double precision, nullif(r->>'lng', '')::double precision, now())
    ON CONFLICT (rayprop_listing_id) DO UPDATE SET title = EXCLUDED.title, state_id = EXCLUDED.state_id, city_id = EXCLUDED.city_id,
      neighbourhood_id = EXCLUDED.neighbourhood_id, suggestion_id = EXCLUDED.suggestion_id, confidence = EXCLUDED.confidence,
      status = EXCLUDED.status, raw_state = EXCLUDED.raw_state, raw_city = EXCLUDED.raw_city, raw_neighbourhood = EXCLUDED.raw_neighbourhood,
      raw_address = EXCLUDED.raw_address, lat = EXCLUDED.lat, lng = EXCLUDED.lng, updated_at = now();
    c := c + 1;
  END LOOP;
  RETURN c;
END; $$;

-- Admin confirms or fixes the place for one listing (kind = 'local' | 'partner').
CREATE OR REPLACE FUNCTION public.set_listing_location(_kind text, _id text, _location_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ch record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO ch FROM public.location_chain(_location_id);
  IF ch.state_id IS NULL THEN RAISE EXCEPTION 'Unknown place'; END IF;
  IF _kind = 'local' THEN
    UPDATE public.listings SET state_id = ch.state_id, city_id = ch.city_id, neighbourhood_id = ch.neighbourhood_id,
      location_status = 'confirmed', location_confidence = 1, location_suggestion_id = _location_id
    WHERE id = _id::uuid;
  ELSE
    UPDATE public.partner_location_map SET state_id = ch.state_id, city_id = ch.city_id, neighbourhood_id = ch.neighbourhood_id,
      status = 'confirmed', confidence = 1, suggestion_id = _location_id, updated_at = now()
    WHERE rayprop_listing_id = _id;
  END IF;
  INSERT INTO public.admin_audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'listing.location_set', _kind || '_listing', _id, jsonb_build_object('location_id', _location_id));
END; $$;

CREATE OR REPLACE FUNCTION public.location_audit_summary() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  WITH rows AS (
    SELECT 'local' AS kind, state_id, city_id, neighbourhood_id, location_status AS status FROM public.listings
    UNION ALL
    SELECT 'partner', state_id, city_id, neighbourhood_id, status FROM public.partner_location_map
  )
  SELECT jsonb_object_agg(kind, s) INTO res FROM (
    SELECT kind, jsonb_build_object(
      'total', count(*),
      'with_state', count(*) FILTER (WHERE state_id IS NOT NULL),
      'with_city', count(*) FILTER (WHERE city_id IS NOT NULL),
      'with_neighbourhood', count(*) FILTER (WHERE neighbourhood_id IS NOT NULL),
      'neighbourhood_applicable_missing', count(*) FILTER (WHERE neighbourhood_id IS NULL AND city_id IS NOT NULL
         AND EXISTS (SELECT 1 FROM public.locations c WHERE c.parent_id = rows.city_id)),
      'complete', count(*) FILTER (WHERE status IN ('ok','confirmed') AND state_id IS NOT NULL AND city_id IS NOT NULL),
      'review', count(*) FILTER (WHERE status NOT IN ('ok','confirmed') OR city_id IS NULL)
    ) AS s FROM rows GROUP BY kind
  ) t;
  RETURN coalesce(res, '{}'::jsonb);
END; $$;

-- Raw spellings that were merged into one canonical place.
CREATE OR REPLACE FUNCTION public.location_merge_report()
RETURNS TABLE(location_id uuid, location_name text, breadcrumb text, variants text[], listings integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  RETURN QUERY
  WITH raw AS (
    SELECT coalesce(neighbourhood_id, city_id) AS lid, btrim(split_part(location_raw, ',', 1)) AS v
    FROM public.listings WHERE coalesce(neighbourhood_id, city_id) IS NOT NULL AND location_raw IS NOT NULL
    UNION ALL
    SELECT coalesce(neighbourhood_id, city_id),
      btrim(coalesce(nullif(raw_neighbourhood, ''), raw_city) || CASE WHEN coalesce(raw_city, '') <> '' AND coalesce(raw_neighbourhood, '') <> '' THEN ', ' || raw_city ELSE '' END)
    FROM public.partner_location_map WHERE coalesce(neighbourhood_id, city_id) IS NOT NULL
  )
  SELECT l.id, l.name,
    concat_ws(', ', p.name, gp.name),
    array_agg(DISTINCT raw.v ORDER BY raw.v),
    count(*)::int
  FROM raw JOIN public.locations l ON l.id = raw.lid
  LEFT JOIN public.locations p ON p.id = l.parent_id
  LEFT JOIN public.locations gp ON gp.id = p.parent_id
  WHERE raw.v <> ''
  GROUP BY l.id, l.name, p.name, gp.name
  HAVING count(DISTINCT lower(raw.v)) > 1
  ORDER BY count(*) DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.refresh_location_counts() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  WITH tagged AS (
    SELECT state_id, city_id, neighbourhood_id FROM public.listings
      WHERE verified AND is_available AND location_status IN ('ok','confirmed')
    UNION ALL
    SELECT state_id, city_id, neighbourhood_id FROM public.partner_location_map WHERE status IN ('ok','confirmed')
  ), ids AS (
    SELECT state_id AS id FROM tagged UNION ALL SELECT city_id FROM tagged UNION ALL SELECT neighbourhood_id FROM tagged
  ), counts AS (SELECT id, count(*)::int AS n FROM ids WHERE id IS NOT NULL GROUP BY id)
  UPDATE public.locations l SET listing_count = coalesce(c.n, 0)
  FROM public.locations l2 LEFT JOIN counts c ON c.id = l2.id
  WHERE l.id = l2.id AND l.listing_count IS DISTINCT FROM coalesce(c.n, 0);
END; $$;

REVOKE EXECUTE ON FUNCTION public.match_location(text, text, text, text, double precision, double precision) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tag_partner_locations(jsonb, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tag_partner_locations(jsonb, boolean) TO service_role;
REVOKE EXECUTE ON FUNCTION public.refresh_location_counts() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.retag_local_listings() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_listing_location(text, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.location_audit_summary() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.location_merge_report() FROM PUBLIC, anon;

SELECT cron.schedule('refresh-location-counts', '15 1 * * *', $c$ SELECT public.refresh_location_counts(); $c$);