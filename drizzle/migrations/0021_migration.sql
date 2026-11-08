CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public settings readable" ON public.app_settings FOR SELECT USING (is_public OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update settings" ON public.app_settings FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.app_settings_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := coalesce(auth.uid(), NEW.updated_by);
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.admin_audit_log(actor_id, action, entity_type, entity_id, metadata)
    VALUES (auth.uid(), 'settings.update', 'setting', NEW.key,
      jsonb_build_object('before', CASE WHEN TG_OP = 'UPDATE' THEN OLD.value END, 'after', NEW.value));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER app_settings_audit BEFORE INSERT OR UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.app_settings_audit();

CREATE OR REPLACE FUNCTION public.setting_int(_key text, _default int) RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce((SELECT CASE WHEN jsonb_typeof(value) = 'number' THEN (value #>> '{}')::numeric::int END FROM public.app_settings WHERE key = _key), _default)
$$;

INSERT INTO public.app_settings(key, value, is_public) VALUES
 ('features', '{"search_fields":true,"phone_signin":false,"whatsapp":false,"card_payments":true,"holds":true,"report_problem":true,"id_required":false,"map":true,"mapbox":false}', true),
 ('service_fee_bps', '800', true),
 ('markup_per_night_kobo', 'null', false),
 ('commission_bps', '1500', false),
 ('guest_service_fee_bps', '0', true),
 ('payout_delay_days', '1', false),
 ('hold_minutes', '15', true),
 ('payment_window_minutes', '60', true),
 ('reply_target_urgent_minutes', '15', false),
 ('reply_target_normal_minutes', '60', false),
 ('host_accept_hours', '24', true),
 ('ical_sync_minutes', '30', false),
 ('instant_book_default', 'true', false),
 ('support_email', '"support@stayglobal.app"', true),
 ('staff_alert_emails', '""', false),
 ('staff_alert_phones', '""', false),
 ('wallet_alert_threshold_kobo', '100000000', false),
 ('sg_bank_account', '"Ray Integrated Technologies, 1028450877, United Bank for Africa"', true),
 ('company', '"StayGlobal"', true),
 ('guarantee_text', '"If your stay isn''t as described, tell us within 24 hours of check-in and we''ll make it right."', true);

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
  IF _category NOT IN ('power','water','cleanliness','access','noise','safety','other') THEN RAISE EXCEPTION 'Pick a category'; END IF;
  IF length(btrim(coalesce(_note,''))) < 5 THEN RAISE EXCEPTION 'Tell us a bit more about the problem'; END IF;
  _m := coalesce(_media, '{}');
  IF array_length(_m, 1) > 5 THEN RAISE EXCEPTION 'Up to 5 photos'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(_m) p WHERE p NOT LIKE auth.uid()::text || '/%') THEN RAISE EXCEPTION 'Invalid photo'; END IF;
  LOOP
    _ref := 'P-' || upper(substr(md5(random()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.support_issues WHERE ref = _ref);
  END LOOP;
  INSERT INTO public.support_issues(ref, booking_id, user_id, category, urgent, note, media, reply_due_at, last_guest_message_at)
  VALUES (_ref, _booking_id, auth.uid(), _category, coalesce(_urgent,false), left(btrim(_note), 2000), _m,
          now() + make_interval(mins => CASE WHEN coalesce(_urgent,false) THEN public.setting_int('reply_target_urgent_minutes', 15) ELSE public.setting_int('reply_target_normal_minutes', 60) END), now())
  RETURNING id INTO _id;
  INSERT INTO public.support_issue_events(issue_id, author_type, author_id, kind, body, media)
  VALUES (_id, 'guest', auth.uid(), 'message', left(btrim(_note), 2000), _m);
  PERFORM public.notify_admins(
    CASE WHEN coalesce(_urgent,false) THEN 'URGENT problem ' ELSE 'New problem ' END || _ref,
    initcap(_category) || ' at ' || replace(b.t, '<', '&lt;') || ' (booking ' || coalesce(b.listing_code,'') || ')',
    '/admin/support?id=' || _id::text);
  RETURN _id;
END $function$;