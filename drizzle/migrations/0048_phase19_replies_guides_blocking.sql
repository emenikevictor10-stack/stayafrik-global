-- Review replies (one public staff reply per review)
CREATE TABLE public.review_replies (
  review_id uuid PRIMARY KEY REFERENCES public.reviews(id) ON DELETE CASCADE,
  body text NOT NULL,
  author_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.review_replies TO anon, authenticated;
GRANT ALL ON public.review_replies TO service_role;
ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "replies readable with visible review" ON public.review_replies FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND (r.hidden = false OR private.is_staff(auth.uid()))));

CREATE OR REPLACE FUNCTION public.staff_review_reply(_review_id uuid, _body text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT private.has_any_role(auth.uid(), ARRAY['admin','listings']::app_role[]) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.reviews WHERE id = _review_id) THEN RAISE EXCEPTION 'Review not found'; END IF;
  IF coalesce(trim(_body),'') = '' THEN
    DELETE FROM public.review_replies WHERE review_id = _review_id;
    INSERT INTO public.admin_audit_log(actor_id, action, entity_type, entity_id) VALUES (auth.uid(), 'review_reply_removed', 'review', _review_id::text);
    RETURN;
  END IF;
  INSERT INTO public.review_replies(review_id, body, author_id) VALUES (_review_id, left(trim(_body), 1000), auth.uid())
    ON CONFLICT (review_id) DO UPDATE SET body = excluded.body, author_id = excluded.author_id, updated_at = now();
  INSERT INTO public.admin_audit_log(actor_id, action, entity_type, entity_id, metadata)
    VALUES (auth.uid(), 'review_reply_saved', 'review', _review_id::text, jsonb_build_object('body', left(trim(_body), 1000)));
END $$;
REVOKE ALL ON FUNCTION public.staff_review_reply(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.staff_review_reply(uuid, text) TO authenticated;

-- Help guides
CREATE TABLE public.help_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  body text[] NOT NULL DEFAULT '{}',
  published boolean NOT NULL DEFAULT false,
  sort integer NOT NULL DEFAULT 0,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.help_guides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.help_guides TO authenticated;
GRANT ALL ON public.help_guides TO service_role;
ALTER TABLE public.help_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published guides public" ON public.help_guides FOR SELECT TO anon, authenticated
  USING (published OR private.is_staff(auth.uid()));
CREATE POLICY "staff insert guides" ON public.help_guides FOR INSERT TO authenticated WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "staff update guides" ON public.help_guides FOR UPDATE TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "staff delete guides" ON public.help_guides FOR DELETE TO authenticated USING (private.is_staff(auth.uid()));

-- Blocked users
CREATE TABLE public.user_status (
  user_id uuid PRIMARY KEY,
  blocked_at timestamptz,
  blocked_reason text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_status TO authenticated;
GRANT ALL ON public.user_status TO service_role;
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or staff read status" ON public.user_status FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION private.is_blocked(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_status WHERE user_id = _user_id AND blocked_at IS NOT NULL)
$$;
GRANT EXECUTE ON FUNCTION private.is_blocked(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.staff_user_action(_user_id uuid, _action text, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT private.has_any_role(auth.uid(), ARRAY['admin','support']::app_role[]) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'You cannot block yourself'; END IF;
  IF _action = 'block' THEN
    IF coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'Add a reason'; END IF;
    IF private.is_staff(_user_id) THEN RAISE EXCEPTION 'Remove their team roles first'; END IF;
    INSERT INTO public.user_status(user_id, blocked_at, blocked_reason, updated_by) VALUES (_user_id, now(), left(trim(_reason),500), auth.uid())
      ON CONFLICT (user_id) DO UPDATE SET blocked_at = now(), blocked_reason = excluded.blocked_reason, updated_by = auth.uid(), updated_at = now();
  ELSIF _action = 'unblock' THEN
    UPDATE public.user_status SET blocked_at = NULL, blocked_reason = NULL, updated_by = auth.uid(), updated_at = now() WHERE user_id = _user_id;
  ELSE RAISE EXCEPTION 'Unknown action'; END IF;
  INSERT INTO public.admin_audit_log(actor_id, action, entity_type, entity_id, metadata)
    VALUES (auth.uid(), 'user_' || _action, 'user', _user_id::text, jsonb_build_object('reason', _reason));
END $$;
REVOKE ALL ON FUNCTION public.staff_user_action(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.staff_user_action(uuid, text, text) TO authenticated;

DROP POLICY "Senders insert messages" ON public.messages;
CREATE POLICY "Senders insert messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND NOT private.is_blocked(auth.uid()));
DROP POLICY "guest creates own reservation" ON public.reservations;
CREATE POLICY "guest creates own reservation" ON public.reservations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = guest_id AND NOT private.is_blocked(auth.uid()));
