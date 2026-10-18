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
      CASE sc.type WHEN 'neighbourhood' THEN 3 WHEN 'city' THEN 2 ELSE 1 END AS depth,
      -- strong matches rank by depth; a close spelling only outranks a strong match one level up
      CASE sc.type WHEN 'neighbourhood' THEN 3 WHEN 'city' THEN 2 ELSE 1 END * 2 - CASE WHEN sc.s >= 0.8 THEN 0 ELSE 2.5 END AS tier
    FROM sc WHERE sc.s >= 0.4
    ORDER BY 6 DESC, 4 DESC
    LIMIT 2
  LOOP
    n := n + 1;
    IF n = 1 THEN best := r; ELSE second := r; END IF;
  END LOOP;

  IF n > 0 THEN
    pick := best.id;
    conf := least(best.f, 1.0);
    IF n = 2 AND lower(second.name) = lower(best.name) AND second.f = best.f AND second.tier = best.tier THEN
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