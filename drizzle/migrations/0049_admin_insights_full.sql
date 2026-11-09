CREATE OR REPLACE FUNCTION public.admin_insights(_from date, _to date)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE len int := greatest(1, _to - _from + 1); pf date := _from - len; pt date := _from - 1; today date := (now() AT TIME ZONE 'Africa/Lagos')::date; j jsonb;
BEGIN
  IF NOT private.has_any_role(auth.uid(), '{admin,finance}'::public.app_role[]) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  WITH b AS (
    SELECT bk.*, (bk.created_at AT TIME ZONE 'Africa/Lagos')::date AS c_day,
      (coalesce(bk.confirmed_at, CASE WHEN bk.status IN ('confirmed','released','completed') THEN bk.paid_at END) AT TIME ZONE 'Africa/Lagos')::date AS s_day,
      (bk.paid_at AT TIME ZONE 'Africa/Lagos')::date AS p_day,
      (bk.check_out_date - bk.check_in_date) AS nights,
      coalesce(l.city, bk.partner_city, 'Unknown') AS area,
      coalesce(l.title, bk.partner_title, 'Stay') AS stay_title,
      coalesce(bk.listing_id::text, bk.rayprop_listing_id) AS stay_ref,
      EXISTS (SELECT 1 FROM public.bank_transfers t WHERE t.booking_id = bk.id AND t.status = 'approved') AS by_bank
    FROM public.bookings bk LEFT JOIN public.listings l ON l.id = bk.listing_id),
  sold AS (SELECT * FROM b WHERE s_day BETWEEN _from AND _to),
  sold_p AS (SELECT * FROM b WHERE s_day BETWEEN pf AND pt),
  paid AS (SELECT * FROM b WHERE p_day BETWEEN _from AND _to),
  paid_p AS (SELECT * FROM b WHERE p_day BETWEEN pf AND pt),
  started AS (SELECT * FROM b WHERE c_day BETWEEN _from AND _to),
  ao AS (SELECT * FROM public.addon_orders WHERE status IN ('paid','needs_attention','confirmed','done')),
  days AS (SELECT d::date AS day, (d::date - len) AS pday FROM generate_series(_from, _to, interval '1 day') d)
  SELECT jsonb_build_object(
    'from', _from, 'to', _to, 'prev_from', pf, 'prev_to', pt,
    'headline', jsonb_build_object(
      'current', jsonb_build_object('value', (SELECT coalesce(sum(total_price),0) FROM sold), 'received', (SELECT coalesce(sum(total_price),0) FROM paid),
        'confirmed', (SELECT count(*) FROM sold), 'nights', (SELECT coalesce(sum(nights),0) FROM sold)),
      'previous', jsonb_build_object('value', (SELECT coalesce(sum(total_price),0) FROM sold_p), 'received', (SELECT coalesce(sum(total_price),0) FROM paid_p),
        'confirmed', (SELECT count(*) FROM sold_p), 'nights', (SELECT coalesce(sum(nights),0) FROM sold_p)),
      'days', (SELECT coalesce(jsonb_agg(jsonb_build_object('day', day,
          'value', (SELECT coalesce(sum(total_price),0) FROM b WHERE s_day = day), 'value_p', (SELECT coalesce(sum(total_price),0) FROM b WHERE s_day = pday),
          'received', (SELECT coalesce(sum(total_price),0) FROM b WHERE p_day = day), 'received_p', (SELECT coalesce(sum(total_price),0) FROM b WHERE p_day = pday),
          'confirmed', (SELECT count(*) FROM b WHERE s_day = day), 'confirmed_p', (SELECT count(*) FROM b WHERE s_day = pday),
          'nights', (SELECT coalesce(sum(nights),0) FROM b WHERE s_day = day), 'nights_p', (SELECT coalesce(sum(nights),0) FROM b WHERE s_day = pday),
          'cancelled', (SELECT count(*) FROM b WHERE c_day = day AND status IN ('cancelled','refunded','declined')),
          'started', (SELECT count(*) FROM b WHERE c_day = day),
          'signups', (SELECT count(*) FROM public.profiles WHERE (created_at AT TIME ZONE 'Africa/Lagos')::date = day)
        ) ORDER BY day), '[]') FROM days)),
    'funnel', jsonb_build_object(
      'started', (SELECT count(*) FROM started),
      'held', (SELECT count(*) FROM started s WHERE s.paid_at IS NOT NULL OR EXISTS (SELECT 1 FROM public.booking_events e WHERE e.booking_id = s.id AND e.type IN ('status:held','status:reserved','status:awaiting_host','status:paid'))),
      'reserved', (SELECT count(*) FROM started s WHERE s.paid_at IS NOT NULL OR EXISTS (SELECT 1 FROM public.booking_events e WHERE e.booking_id = s.id AND e.type IN ('status:reserved','status:awaiting_host','status:paid'))),
      'paid', (SELECT count(*) FROM started WHERE paid_at IS NOT NULL),
      'confirmed', (SELECT count(*) FROM started WHERE s_day IS NOT NULL)),
    'earnings', jsonb_build_object(
      'fees', (SELECT coalesce(sum(fee_kobo),0)/100.0 FROM sold), 'markup', (SELECT coalesce(sum(markup_kobo),0)/100.0 FROM sold),
      'addons', (SELECT coalesce(sum(amount_kobo),0)/100.0 FROM ao WHERE (paid_at AT TIME ZONE 'Africa/Lagos')::date BETWEEN _from AND _to),
      'refunds', (SELECT coalesce(sum(amount),0) FROM public.refunds WHERE status IN ('success','processed','completed','paid') AND (created_at AT TIME ZONE 'Africa/Lagos')::date BETWEEN _from AND _to),
      'prev_total', (SELECT coalesce(sum(coalesce(fee_kobo,0)+coalesce(markup_kobo,0)),0)/100.0 FROM sold_p)
        + (SELECT coalesce(sum(amount_kobo),0)/100.0 FROM ao WHERE (paid_at AT TIME ZONE 'Africa/Lagos')::date BETWEEN pf AND pt)),
    'pay_mix', jsonb_build_object('bank', (SELECT count(*) FROM paid WHERE by_bank), 'card', (SELECT count(*) FROM paid WHERE NOT by_bank),
      'bank_value', (SELECT coalesce(sum(total_price),0) FROM paid WHERE by_bank), 'card_value', (SELECT coalesce(sum(total_price),0) FROM paid WHERE NOT by_bank),
      'avg', (SELECT coalesce(avg(total_price),0) FROM paid)),
    'tiles', jsonb_build_object(
      'current', jsonb_build_object('nightly', (SELECT coalesce(sum(total_price)/nullif(sum(nights),0),0) FROM sold), 'avg_booking', (SELECT coalesce(avg(total_price),0) FROM sold),
        'avg_stay', (SELECT coalesce(avg(nights),0) FROM sold), 'lead_days', (SELECT coalesce(avg(check_in_date - c_day),0) FROM sold),
        'cancelled_share', (SELECT coalesce(count(*) FILTER (WHERE status IN ('cancelled','refunded','declined'))::numeric / nullif(count(*) FILTER (WHERE paid_at IS NOT NULL OR status IN ('cancelled','refunded','declined')),0),0) FROM started),
        'repeat', (SELECT count(DISTINCT s.guest_id) FROM sold s WHERE EXISTS (SELECT 1 FROM b o WHERE o.guest_id = s.guest_id AND o.id <> s.id AND o.s_day IS NOT NULL AND o.s_day < s.s_day))),
      'previous', jsonb_build_object('nightly', (SELECT coalesce(sum(total_price)/nullif(sum(nights),0),0) FROM sold_p), 'avg_booking', (SELECT coalesce(avg(total_price),0) FROM sold_p),
        'avg_stay', (SELECT coalesce(avg(nights),0) FROM sold_p), 'lead_days', (SELECT coalesce(avg(check_in_date - c_day),0) FROM sold_p),
        'cancelled_share', (SELECT coalesce(count(*) FILTER (WHERE status IN ('cancelled','refunded','declined'))::numeric / nullif(count(*) FILTER (WHERE paid_at IS NOT NULL OR status IN ('cancelled','refunded','declined')),0),0) FROM b WHERE c_day BETWEEN pf AND pt),
        'repeat', (SELECT count(DISTINCT s.guest_id) FROM sold_p s WHERE EXISTS (SELECT 1 FROM b o WHERE o.guest_id = s.guest_id AND o.id <> s.id AND o.s_day IS NOT NULL AND o.s_day < s.s_day)))),
    'stay_length', (SELECT coalesce(jsonb_agg(jsonb_build_object('label', lbl, 'n', (SELECT count(*) FROM sold WHERE CASE WHEN nights >= 7 THEN 7 ELSE nights END = k)) ORDER BY k), '[]')
       FROM (VALUES (1,'1'),(2,'2'),(3,'3'),(4,'4'),(5,'5'),(6,'6'),(7,'7+')) v(k,lbl)),
    'checkin_dow', (SELECT coalesce(jsonb_agg(jsonb_build_object('label', lbl, 'n', (SELECT count(*) FROM sold WHERE extract(isodow FROM check_in_date) = k)) ORDER BY k), '[]')
       FROM (VALUES (1,'Mon'),(2,'Tue'),(3,'Wed'),(4,'Thu'),(5,'Fri'),(6,'Sat'),(7,'Sun')) v(k,lbl)),
    'lead_time', (SELECT coalesce(jsonb_agg(jsonb_build_object('label', lbl, 'n', (SELECT count(*) FROM sold WHERE (check_in_date - c_day) BETWEEN lo AND hi)) ORDER BY lo), '[]')
       FROM (VALUES (0,0,'Same day'),(1,3,'1–3 days'),(4,7,'4–7 days'),(8,14,'1–2 weeks'),(15,30,'2–4 weeks'),(31,100000,'30+ days')) v(lo,hi,lbl)),
    'next30', (SELECT coalesce(jsonb_agg(jsonb_build_object('day', n::date,
        'in_house', (SELECT count(*) FROM b WHERE s_day IS NOT NULL AND status IN ('confirmed','released','completed') AND check_in_date <= n::date AND check_out_date > n::date),
        'arrivals', (SELECT count(*) FROM b WHERE s_day IS NOT NULL AND status IN ('confirmed','released','completed') AND check_in_date = n::date)) ORDER BY n), '[]')
       FROM generate_series(today, today + 29, interval '1 day') n),
    'next30_value', (SELECT coalesce(sum(total_price),0) FROM b WHERE s_day IS NOT NULL AND status IN ('confirmed','released','completed') AND check_in_date BETWEEN today AND today + 29),
    'top_areas', (SELECT coalesce(jsonb_agg(x ORDER BY (x->>'value')::numeric DESC), '[]') FROM (SELECT jsonb_build_object('label', area, 'value', sum(total_price), 'bookings', count(*), 'nights', sum(nights)) x FROM sold GROUP BY area ORDER BY sum(total_price) DESC LIMIT 8) t),
    'top_stays', (SELECT coalesce(jsonb_agg(x ORDER BY (x->>'value')::numeric DESC), '[]') FROM (SELECT jsonb_build_object('label', max(stay_title), 'ref', stay_ref, 'source', max(source), 'value', sum(total_price), 'bookings', count(*), 'nights', sum(nights)) x FROM sold GROUP BY stay_ref ORDER BY sum(total_price) DESC LIMIT 8) t),
    'by_source', (SELECT coalesce(jsonb_object_agg(source, jsonb_build_object('value', v, 'earnings', e, 'bookings', n)), '{}') FROM (SELECT source, sum(total_price) v, sum(coalesce(fee_kobo,0)+coalesce(markup_kobo,0))/100.0 e, count(*) n FROM sold GROUP BY source) s),
    'guests', jsonb_build_object('signups', (SELECT count(*) FROM public.profiles WHERE (created_at AT TIME ZONE 'Africa/Lagos')::date BETWEEN _from AND _to),
      'signups_prev', (SELECT count(*) FROM public.profiles WHERE (created_at AT TIME ZONE 'Africa/Lagos')::date BETWEEN pf AND pt),
      'bookers', (SELECT count(DISTINCT guest_id) FROM sold), 'total_users', (SELECT count(*) FROM public.profiles))
  ) INTO j;
  RETURN j;
END $function$;