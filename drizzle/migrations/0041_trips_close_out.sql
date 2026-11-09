ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_reason text;

CREATE TABLE public.listing_private (
  listing_id uuid PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  access_instructions text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.listing_private TO authenticated;
GRANT ALL ON public.listing_private TO service_role;
ALTER TABLE public.listing_private ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts manage own listing private info" ON public.listing_private FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.host_id = auth.uid()));
CREATE POLICY "Staff read listing private info" ON public.listing_private FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

CREATE OR REPLACE FUNCTION public.trip_access(_booking_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.access_instructions FROM public.bookings b JOIN public.listing_private p ON p.listing_id = b.listing_id
  WHERE b.id = _booking_id AND b.guest_id = auth.uid() AND b.status IN ('confirmed','released','completed')
$$;
REVOKE EXECUTE ON FUNCTION public.trip_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trip_access(uuid) TO authenticated;

ALTER TABLE public.support_issues DROP CONSTRAINT IF EXISTS support_issues_category_check;
ALTER TABLE public.support_issues ADD CONSTRAINT support_issues_category_check CHECK (category = ANY (ARRAY['power','water','cleanliness','access','noise','safety','other','guarantee_move']));

CREATE OR REPLACE FUNCTION public.create_support_issue(_booking_id uuid, _category text, _urgent boolean, _note text, _media text[] DEFAULT '{}'::text[])
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE b record; _id uuid; _ref text; _m text[];
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  SELECT bk.*, coalesce(l.title, bk.partner_title, 'your stay') AS t INTO b
  FROM public.bookings bk LEFT JOIN public.listings l ON l.id = bk.listing_id WHERE bk.id = _booking_id;
  IF NOT FOUND OR b.guest_id <> auth.uid() THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF b.status NOT IN ('confirmed','released','completed','needs_attention','processing') THEN
    RAISE EXCEPTION 'You can report a problem only on a paid booking';
  END IF;
  IF _category NOT IN ('power','water','cleanliness','access','noise','safety','other','guarantee_move') THEN RAISE EXCEPTION 'Pick a category'; END IF;
  IF _category = 'guarantee_move' AND (current_date < b.check_in_date OR current_date >= b.check_out_date) THEN
    RAISE EXCEPTION 'You can ask to move only during your stay';
  END IF;
  IF length(btrim(coalesce(_note,''))) < 5 THEN RAISE EXCEPTION 'Tell us a bit more about the problem'; END IF;
  _m := coalesce(_media, '{}');
  IF array_length(_m, 1) > 5 THEN RAISE EXCEPTION 'Up to 5 photos'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(_m) p WHERE p NOT LIKE auth.uid()::text || '/%') THEN RAISE EXCEPTION 'Invalid photo'; END IF;
  LOOP
    _ref := 'P-' || upper(substr(md5(random()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.support_issues WHERE ref = _ref);
  END LOOP;
  INSERT INTO public.support_issues(ref, booking_id, user_id, category, urgent, note, media, reply_due_at, last_guest_message_at)
  VALUES (_ref, _booking_id, auth.uid(), _category, coalesce(_urgent,false) OR _category = 'guarantee_move', left(btrim(_note), 2000), _m,
          now() + make_interval(mins => CASE WHEN coalesce(_urgent,false) OR _category = 'guarantee_move' THEN public.setting_int('reply_target_urgent_minutes', 15) ELSE public.setting_int('reply_target_normal_minutes', 60) END), now())
  RETURNING id INTO _id;
  INSERT INTO public.support_issue_events(issue_id, author_type, author_id, kind, body, media)
  VALUES (_id, 'guest', auth.uid(), 'message', left(btrim(_note), 2000), _m);
  PERFORM public.notify_admins(
    CASE WHEN _category = 'guarantee_move' THEN 'Guarantee move request ' WHEN coalesce(_urgent,false) THEN 'URGENT problem ' ELSE 'New problem ' END || _ref,
    initcap(replace(_category,'_',' ')) || ' at ' || replace(b.t, '<', '&lt;') || ' (booking ' || coalesce(b.listing_code,'') || ')',
    '/admin/support?id=' || _id::text);
  RETURN _id;
END $function$;