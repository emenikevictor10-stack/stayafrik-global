
CREATE TABLE public.support_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE,
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  user_id uuid NOT NULL,
  category text NOT NULL,
  urgent boolean NOT NULL DEFAULT false,
  note text NOT NULL,
  media text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'received',
  owner_id uuid,
  reply_due_at timestamptz NOT NULL,
  first_reply_at timestamptz,
  asked_fixed_at timestamptz,
  closed_at timestamptz,
  rating integer,
  reopened_count integer NOT NULL DEFAULT 0,
  last_guest_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_issues_category_chk CHECK (category IN ('power','water','cleanliness','access','noise','safety','other')),
  CONSTRAINT support_issues_status_chk CHECK (status IN ('received','in_progress','waiting_host','waiting_guest','asked_fixed','closed')),
  CONSTRAINT support_issues_rating_chk CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)
);
CREATE INDEX support_issues_user_idx ON public.support_issues(user_id, created_at DESC);
CREATE INDEX support_issues_queue_idx ON public.support_issues(status, urgent DESC, reply_due_at);

GRANT SELECT ON public.support_issues TO authenticated;
GRANT ALL ON public.support_issues TO service_role;
ALTER TABLE public.support_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guests read own issues" ON public.support_issues FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read all issues" ON public.support_issues FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_support_issues_updated BEFORE UPDATE ON public.support_issues
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.support_issue_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.support_issues(id) ON DELETE CASCADE,
  author_type text NOT NULL,
  author_id uuid,
  channel text NOT NULL DEFAULT 'app',
  kind text NOT NULL,
  body text,
  media text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sie_author_chk CHECK (author_type IN ('guest','staff','system')),
  CONSTRAINT sie_kind_chk CHECK (kind IN ('message','note','status')),
  CONSTRAINT sie_channel_chk CHECK (channel IN ('app','email','internal'))
);
CREATE INDEX support_issue_events_issue_idx ON public.support_issue_events(issue_id, created_at);

GRANT SELECT ON public.support_issue_events TO authenticated;
GRANT ALL ON public.support_issue_events TO service_role;
ALTER TABLE public.support_issue_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guests read own issue events (no internal notes)" ON public.support_issue_events FOR SELECT TO authenticated
USING (kind <> 'note' AND EXISTS (SELECT 1 FROM public.support_issues i WHERE i.id = issue_id AND i.user_id = auth.uid()));
CREATE POLICY "Admins read all issue events" ON public.support_issue_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_issues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_issue_events;

-- Notify every admin (in-app + email)
CREATE OR REPLACE FUNCTION public.notify_admins(_title text, _body text, _link text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE a uuid;
BEGIN
  FOR a IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications(user_id, type, title, body, link) VALUES (a, 'support', _title, _body, _link);
    PERFORM public.send_alert_email(a, _title, _title, _body, _link);
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_admins(text, text, text) FROM PUBLIC, anon, authenticated;

-- Guest: report a problem on one of their paid stays
CREATE OR REPLACE FUNCTION public.create_support_issue(_booking_id uuid, _category text, _urgent boolean, _note text, _media text[] DEFAULT '{}')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE b record; _id uuid; _ref text; _title text; _m text[];
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
          now() + make_interval(mins => CASE WHEN coalesce(_urgent,false) THEN 15 ELSE 60 END), now())
  RETURNING id INTO _id;
  INSERT INTO public.support_issue_events(issue_id, author_type, author_id, kind, body, media)
  VALUES (_id, 'guest', auth.uid(), 'message', left(btrim(_note), 2000), _m);
  PERFORM public.notify_admins(
    CASE WHEN coalesce(_urgent,false) THEN 'URGENT problem ' ELSE 'New problem ' END || _ref,
    initcap(_category) || ' at ' || replace(b.t, '<', '&lt;') || ' (booking ' || coalesce(b.listing_code,'') || ')',
    '/admin/support?id=' || _id::text);
  RETURN _id;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_support_issue(uuid, text, boolean, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_support_issue(uuid, text, boolean, text, text[]) TO authenticated;

-- Guest: reply, answer "is it fixed?", rate
CREATE OR REPLACE FUNCTION public.guest_issue_action(_issue_id uuid, _action text, _body text DEFAULT NULL, _media text[] DEFAULT '{}', _value integer DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE i record; _m text[] := coalesce(_media, '{}');
BEGIN
  SELECT * INTO i FROM public.support_issues WHERE id = _issue_id FOR UPDATE;
  IF NOT FOUND OR i.user_id <> auth.uid() THEN RAISE EXCEPTION 'Problem not found'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(_m) p WHERE p NOT LIKE auth.uid()::text || '/%') THEN RAISE EXCEPTION 'Invalid photo'; END IF;

  IF _action = 'reply' THEN
    IF i.status = 'closed' THEN RAISE EXCEPTION 'This problem is closed'; END IF;
    IF length(btrim(coalesce(_body,''))) = 0 AND array_length(_m,1) IS NULL THEN RAISE EXCEPTION 'Write a message'; END IF;
    INSERT INTO public.support_issue_events(issue_id, author_type, author_id, kind, body, media)
    VALUES (i.id, 'guest', auth.uid(), 'message', left(btrim(coalesce(_body,'')), 2000), _m);
    UPDATE public.support_issues SET last_guest_message_at = now(),
      status = CASE WHEN status IN ('waiting_guest','asked_fixed') THEN 'in_progress' ELSE status END,
      reply_due_at = CASE WHEN status IN ('waiting_guest','asked_fixed') THEN now() + make_interval(mins => CASE WHEN urgent THEN 15 ELSE 60 END) ELSE reply_due_at END
    WHERE id = i.id;
    PERFORM public.notify_admins('Guest replied on ' || i.ref, left(replace(coalesce(_body,''),'<','&lt;'), 140), '/admin/support?id=' || i.id::text);

  ELSIF _action = 'answer_fixed' THEN
    IF i.status <> 'asked_fixed' THEN RAISE EXCEPTION 'We have not asked yet'; END IF;
    IF _value = 1 THEN
      UPDATE public.support_issues SET status = 'closed', closed_at = now() WHERE id = i.id;
      INSERT INTO public.support_issue_events(issue_id, author_type, author_id, kind, body)
      VALUES (i.id, 'guest', auth.uid(), 'status', 'Guest confirmed it is fixed. Closed.');
    ELSE
      UPDATE public.support_issues SET status = 'in_progress', reopened_count = reopened_count + 1,
        reply_due_at = now() + make_interval(mins => CASE WHEN urgent THEN 15 ELSE 60 END) WHERE id = i.id;
      INSERT INTO public.support_issue_events(issue_id, author_type, author_id, kind, body)
      VALUES (i.id, 'guest', auth.uid(), 'status', 'Guest says it is not fixed yet.');
      PERFORM public.notify_admins('Not fixed: ' || i.ref, 'The guest says the problem is not fixed yet.', '/admin/support?id=' || i.id::text);
    END IF;

  ELSIF _action = 'rate' THEN
    IF i.status <> 'closed' THEN RAISE EXCEPTION 'You can rate once it is closed'; END IF;
    IF _value IS NULL OR _value NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Pick 1 to 5 stars'; END IF;
    UPDATE public.support_issues SET rating = _value WHERE id = i.id;
  ELSE
    RAISE EXCEPTION 'Unknown action';
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.guest_issue_action(uuid, text, text, text[], integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guest_issue_action(uuid, text, text, text[], integer) TO authenticated;

-- Staff actions (admin only, audited)
CREATE OR REPLACE FUNCTION public.staff_issue_action(_issue_id uuid, _action text, _body text DEFAULT NULL, _status text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE i record; _before text; _txt text := left(btrim(coalesce(_body,'')), 4000);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO i FROM public.support_issues WHERE id = _issue_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Problem not found'; END IF;
  _before := i.status;

  IF _action = 'assign' THEN
    UPDATE public.support_issues SET owner_id = auth.uid(),
      status = CASE WHEN status = 'received' THEN 'in_progress' ELSE status END WHERE id = i.id;
    INSERT INTO public.support_issue_events(issue_id, author_type, author_id, channel, kind, body)
    VALUES (i.id, 'staff', auth.uid(), 'internal', 'note', 'Picked up by staff.');

  ELSIF _action = 'reply' THEN
    IF i.status = 'closed' THEN RAISE EXCEPTION 'Reopen it first'; END IF;
    IF length(_txt) = 0 THEN RAISE EXCEPTION 'Write a reply'; END IF;
    INSERT INTO public.support_issue_events(issue_id, author_type, author_id, kind, body) VALUES (i.id, 'staff', auth.uid(), 'message', _txt);
    UPDATE public.support_issues SET first_reply_at = coalesce(first_reply_at, now()), owner_id = coalesce(owner_id, auth.uid()),
      status = 'waiting_guest' WHERE id = i.id;
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (i.user_id, 'support', 'StayGlobal replied on ' || i.ref, left(_txt, 120), '/issues/' || i.id::text);
    PERFORM public.send_alert_email(i.user_id, 'Reply on your problem ' || i.ref, 'We replied to your problem',
      replace(left(_txt, 600), '<', '&lt;'), '/issues/' || i.id::text);

  ELSIF _action = 'note' THEN
    IF length(_txt) = 0 THEN RAISE EXCEPTION 'Write a note'; END IF;
    INSERT INTO public.support_issue_events(issue_id, author_type, author_id, channel, kind, body) VALUES (i.id, 'staff', auth.uid(), 'internal', 'note', _txt);

  ELSIF _action = 'log_host_contact' THEN
    IF length(_txt) = 0 THEN RAISE EXCEPTION 'Say what the host said'; END IF;
    INSERT INTO public.support_issue_events(issue_id, author_type, author_id, channel, kind, body) VALUES (i.id, 'staff', auth.uid(), 'internal', 'note', 'Host contact: ' || _txt);
    UPDATE public.support_issues SET status = 'waiting_host' WHERE id = i.id AND status <> 'closed';

  ELSIF _action = 'ask_fixed' THEN
    IF i.status = 'closed' THEN RAISE EXCEPTION 'Already closed'; END IF;
    UPDATE public.support_issues SET status = 'asked_fixed', asked_fixed_at = now(), first_reply_at = coalesce(first_reply_at, now()) WHERE id = i.id;
    INSERT INTO public.support_issue_events(issue_id, author_type, author_id, kind, body)
    VALUES (i.id, 'staff', auth.uid(), 'status', coalesce(nullif(_txt,''), 'Is it fixed now?'));
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (i.user_id, 'support', 'Is it fixed? (' || i.ref || ')', 'Tap to tell us if the problem is sorted.', '/issues/' || i.id::text);
    PERFORM public.send_alert_email(i.user_id, 'Is your problem fixed? ' || i.ref, 'Is it fixed?',
      'We think the problem is sorted. Please tell us yes or no in the app.', '/issues/' || i.id::text);

  ELSIF _action = 'escalate' THEN
    UPDATE public.support_issues SET urgent = true,
      reply_due_at = least(reply_due_at, now() + interval '15 minutes') WHERE id = i.id;
    INSERT INTO public.support_issue_events(issue_id, author_type, author_id, channel, kind, body)
    VALUES (i.id, 'staff', auth.uid(), 'internal', 'note', 'Marked urgent' || CASE WHEN _txt <> '' THEN ': ' || _txt ELSE '' END);

  ELSIF _action = 'set_status' THEN
    IF _status NOT IN ('received','in_progress','waiting_host','waiting_guest') THEN RAISE EXCEPTION 'Bad status'; END IF;
    UPDATE public.support_issues SET status = _status,
      reopened_count = reopened_count + CASE WHEN i.status = 'closed' THEN 1 ELSE 0 END,
      closed_at = NULL WHERE id = i.id;
    INSERT INTO public.support_issue_events(issue_id, author_type, author_id, channel, kind, body)
    VALUES (i.id, 'staff', auth.uid(), 'internal', 'note', 'Status set to ' || replace(_status,'_',' '));

  ELSIF _action = 'close' THEN
    UPDATE public.support_issues SET status = 'closed', closed_at = now() WHERE id = i.id;
    INSERT INTO public.support_issue_events(issue_id, author_type, author_id, kind, body)
    VALUES (i.id, 'staff', auth.uid(), 'status', 'Closed by StayGlobal' || CASE WHEN _txt <> '' THEN ': ' || _txt ELSE '.' END);
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (i.user_id, 'support', 'Problem ' || i.ref || ' closed', 'Tell us how we did.', '/issues/' || i.id::text);
  ELSE
    RAISE EXCEPTION 'Unknown action';
  END IF;

  INSERT INTO public.admin_audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'support.' || _action, 'support_issue', i.id::text,
    jsonb_build_object('ref', i.ref, 'before', _before, 'after', (SELECT status FROM public.support_issues WHERE id = i.id)));
END $$;
REVOKE EXECUTE ON FUNCTION public.staff_issue_action(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_issue_action(uuid, text, text, text) TO authenticated;

-- Photos: guests upload into their own folder; guests read own; admins read all
CREATE POLICY "Guests upload own issue photos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'issue-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Guests read own issue photos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'issue-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins read issue photos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'issue-photos' AND public.has_role(auth.uid(), 'admin'));
