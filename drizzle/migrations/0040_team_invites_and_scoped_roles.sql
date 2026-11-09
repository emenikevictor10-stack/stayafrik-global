CREATE OR REPLACE FUNCTION private.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

CREATE OR REPLACE FUNCTION private.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND role IN ('admin'::public.app_role,'support'::public.app_role,'finance'::public.app_role,'listings'::public.app_role))
$$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_any_role(uuid, public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_staff(uuid) TO authenticated;

-- Invites
CREATE TABLE public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  roles public.app_role[] NOT NULL,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  accepted_user_id uuid
);
CREATE UNIQUE INDEX team_invites_one_pending ON public.team_invites (lower(email)) WHERE status = 'pending';
GRANT SELECT ON public.team_invites TO authenticated;
GRANT ALL ON public.team_invites TO service_role;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read invites" ON public.team_invites FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION private.team_roles() RETURNS public.app_role[] LANGUAGE sql IMMUTABLE AS $$
  SELECT ARRAY['admin','support','finance','listings']::public.app_role[]
$$;

CREATE OR REPLACE FUNCTION private.send_team_invite_email(_email text, _roles public.app_role[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _mid uuid := gen_random_uuid(); _r text := array_to_string(_roles, ', ');
BEGIN
  IF EXISTS (SELECT 1 FROM public.suppressed_emails WHERE email = _email) THEN RETURN; END IF;
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'message_id', _mid::text, 'to', _email,
    'from', 'StayGlobal <noreply@notify.stayglobal.app>', 'sender_domain', 'notify.stayglobal.app',
    'subject', 'You''ve been invited to the Stay team',
    'html', '<!doctype html><html><body style="margin:0;font-family:Helvetica,Arial,sans-serif;background:#ffffff;color:#111">'
      || '<div style="max-width:520px;margin:0 auto;padding:32px 24px"><div style="font-size:20px;font-weight:800;margin-bottom:24px">Stay</div>'
      || '<h1 style="font-size:18px;margin:0 0 8px">You''re invited to the Stay team</h1>'
      || '<p style="font-size:14px;line-height:1.6;color:#555">You''ve been given these roles: ' || _r || '. Sign in with Google using this email address to join.</p>'
      || '<a href="https://stayglobal.app/auth" style="display:inline-block;background:#111;color:#fff;font-weight:700;font-size:14px;padding:12px 20px;border-radius:999px;text-decoration:none">Sign in to join</a>'
      || '</div></body></html>',
    'text', 'You''re invited to the Stay team (' || _r || '). Sign in with Google using this email: https://stayglobal.app/auth',
    'purpose', 'transactional', 'label', 'team_invite',
    'idempotency_key', 'team-invite-' || _mid::text, 'queued_at', now()));
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'team invite email failed: %', SQLERRM;
END $$;

CREATE OR REPLACE FUNCTION private.apply_team_invites(_uid uuid, _email text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i record; n int := 0;
BEGIN
  IF _uid IS NULL OR coalesce(_email,'') = '' THEN RETURN 0; END IF;
  FOR i IN SELECT * FROM public.team_invites WHERE status='pending' AND lower(email)=lower(_email) LOOP
    INSERT INTO public.user_roles(user_id, role) SELECT _uid, r FROM unnest(i.roles) r ON CONFLICT DO NOTHING;
    UPDATE public.team_invites SET status='accepted', accepted_at=now(), accepted_user_id=_uid WHERE id=i.id;
    INSERT INTO public.admin_audit_log(actor_id, action, entity_type, entity_id, metadata)
      VALUES (_uid, 'team_invite_accepted', 'user', _uid::text, jsonb_build_object('roles', i.roles, 'invite_id', i.id));
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.accept_team_invites()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  RETURN private.apply_team_invites(auth.uid(), _email);
END $$;
REVOKE EXECUTE ON FUNCTION public.accept_team_invites() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.accept_team_invites() TO authenticated;

CREATE OR REPLACE FUNCTION private.profiles_apply_invites() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN PERFORM private.apply_team_invites(NEW.user_id, NEW.email);
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'apply invites failed: %', SQLERRM; END;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_apply_team_invites AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.profiles_apply_invites();

CREATE OR REPLACE FUNCTION public.staff_team_invite(_email text, _roles public.app_role[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _e text := lower(trim(_email)); _uid uuid;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF _e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Enter a valid email'; END IF;
  IF _roles IS NULL OR cardinality(_roles) = 0 OR NOT (_roles <@ private.team_roles()) THEN RAISE EXCEPTION 'Pick at least one team role'; END IF;
  UPDATE public.team_invites SET status='cancelled' WHERE status='pending' AND lower(email)=_e;
  INSERT INTO public.team_invites(email, roles, invited_by) VALUES (_e, _roles, auth.uid()) RETURNING id INTO _id;
  INSERT INTO public.admin_audit_log(actor_id, action, entity_type, entity_id, metadata)
    VALUES (auth.uid(), 'team_invite', 'invite', _id::text, jsonb_build_object('email', _e, 'roles', _roles));
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = _e LIMIT 1;
  IF _uid IS NOT NULL THEN PERFORM private.apply_team_invites(_uid, _e);
  ELSE PERFORM private.send_team_invite_email(_e, _roles); END IF;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.staff_team_cancel_invite(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  UPDATE public.team_invites SET status='cancelled' WHERE id=_id AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Invite not pending'; END IF;
  INSERT INTO public.admin_audit_log(actor_id, action, entity_type, entity_id) VALUES (auth.uid(), 'team_invite_cancelled', 'invite', _id::text);
END $$;

CREATE OR REPLACE FUNCTION public.staff_team_resend_invite(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i record;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO i FROM public.team_invites WHERE id=_id AND status='pending';
  IF i.id IS NULL THEN RAISE EXCEPTION 'Invite not pending'; END IF;
  PERFORM private.send_team_invite_email(i.email, i.roles);
  INSERT INTO public.admin_audit_log(actor_id, action, entity_type, entity_id) VALUES (auth.uid(), 'team_invite_resent', 'invite', _id::text);
END $$;

CREATE OR REPLACE FUNCTION public.staff_team_set_roles(_user_id uuid, _roles public.app_role[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old public.app_role[];
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  _roles := coalesce(_roles, '{}');
  IF NOT (_roles <@ private.team_roles()) THEN RAISE EXCEPTION 'Not a team role'; END IF;
  IF cardinality(_roles) = 0 THEN RAISE EXCEPTION 'Use Remove from team instead'; END IF;
  IF _user_id = auth.uid() AND NOT ('admin' = ANY(_roles)) THEN RAISE EXCEPTION 'You can''t remove your own admin role'; END IF;
  SELECT coalesce(array_agg(role), '{}') INTO _old FROM public.user_roles WHERE user_id=_user_id AND role = ANY(private.team_roles());
  IF 'admin' = ANY(_old) AND NOT ('admin' = ANY(_roles))
     AND (SELECT count(*) FROM public.user_roles WHERE role='admin') <= 1 THEN RAISE EXCEPTION 'You can''t remove the last admin'; END IF;
  DELETE FROM public.user_roles WHERE user_id=_user_id AND role = ANY(private.team_roles()) AND NOT (role = ANY(_roles));
  INSERT INTO public.user_roles(user_id, role) SELECT _user_id, r FROM unnest(_roles) r ON CONFLICT DO NOTHING;
  INSERT INTO public.admin_audit_log(actor_id, action, entity_type, entity_id, metadata)
    VALUES (auth.uid(), 'team_set_roles', 'user', _user_id::text, jsonb_build_object('from', _old, 'to', _roles));
END $$;

CREATE OR REPLACE FUNCTION public.staff_team_remove(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old public.app_role[];
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'You can''t remove yourself'; END IF;
  SELECT coalesce(array_agg(role), '{}') INTO _old FROM public.user_roles WHERE user_id=_user_id AND role = ANY(private.team_roles());
  IF cardinality(_old) = 0 THEN RAISE EXCEPTION 'Not on the team'; END IF;
  IF 'admin' = ANY(_old) AND (SELECT count(*) FROM public.user_roles WHERE role='admin') <= 1 THEN RAISE EXCEPTION 'You can''t remove the last admin'; END IF;
  DELETE FROM public.user_roles WHERE user_id=_user_id AND role = ANY(private.team_roles());
  INSERT INTO public.admin_audit_log(actor_id, action, entity_type, entity_id, metadata)
    VALUES (auth.uid(), 'team_remove', 'user', _user_id::text, jsonb_build_object('roles', _old));
END $$;

CREATE OR REPLACE FUNCTION public.staff_team_list()
RETURNS TABLE(user_id uuid, full_name text, email text, roles public.app_role[], since timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  RETURN QUERY SELECT r.user_id, p.full_name, coalesce(p.email, u.email::text), array_agg(r.role ORDER BY r.role), min(r.created_at)
  FROM public.user_roles r LEFT JOIN public.profiles p ON p.user_id=r.user_id LEFT JOIN auth.users u ON u.id=r.user_id
  WHERE r.role = ANY(private.team_roles()) GROUP BY r.user_id, p.full_name, p.email, u.email ORDER BY min(r.created_at);
END $$;

DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY['staff_team_invite(text,public.app_role[])','staff_team_cancel_invite(uuid)','staff_team_resend_invite(uuid)','staff_team_set_roles(uuid,public.app_role[])','staff_team_remove(uuid)','staff_team_list()'] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM anon, public', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;

-- Widen function role checks per team role
DO $$
DECLARE r record; d text; arr text;
  pat text := '(private\.|public\.)has_role\(auth\.uid\(\), ?''admin''(::app_role)?\)';
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('admin_insights','admin,finance'), ('staff_payout_action','admin,finance'),
    ('staff_addon_action','admin,support'), ('staff_booking_action','admin,support'),
    ('staff_change_request_action','admin,support'), ('staff_issue_action','admin,support'),
    ('staff_offer_credit','admin,support'), ('issue_invoice','admin,support,finance'),
    ('host_booking_guests','admin,support'), ('host_booking_action','admin,support'),
    ('staff_host_action','admin,listings'), ('location_audit_summary','admin,listings'),
    ('location_merge_report','admin,listings'), ('set_listing_location','admin,listings'),
    ('booking_actor','admin,support,finance,listings')
  ) v(fn, roles) LOOP
    arr := 'private.has_any_role(auth.uid(), ''{' || r.roles || '}''::public.app_role[])';
    SELECT pg_get_functiondef(p.oid) INTO d FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname=r.fn LIMIT 1;
    IF d IS NULL THEN CONTINUE; END IF;
    d := regexp_replace(d, pat, arr, 'g');
    EXECUTE d;
  END LOOP;
END $$;

-- Widen policies: staff can read; role-scoped writes
DO $$
DECLARE p record; q text; w text; rep text; stmt text;
  pat text := '(private\.|public\.)?has_role\(auth\.uid\(\), ''admin''::app_role\)';
BEGIN
  FOR p IN SELECT * FROM pg_policies WHERE schemaname IN ('public','storage')
      AND (coalesce(qual,'') ~ pat OR coalesce(with_check,'') ~ pat) LOOP
    rep := NULL;
    IF p.tablename IN ('admin_audit_log','user_roles','app_settings','team_invites') AND p.cmd <> 'INSERT' THEN CONTINUE; END IF;
    IF p.cmd = 'SELECT' THEN rep := 'private.is_staff(auth.uid())';
    ELSIF p.tablename IN ('listings','kyc_submissions','reviews','locations','listing_blocks','listing_date_prices') THEN
      rep := 'private.has_any_role(auth.uid(), ''{admin,listings}''::public.app_role[])';
    ELSIF p.tablename = 'reservations' THEN
      rep := 'private.has_any_role(auth.uid(), ''{admin,support}''::public.app_role[])';
    ELSIF p.tablename IN ('admin_audit_log','notifications') AND p.cmd = 'INSERT' THEN
      rep := 'private.is_staff(auth.uid())';
    END IF;
    IF rep IS NULL THEN CONTINUE; END IF;
    q := CASE WHEN p.qual IS NULL THEN NULL ELSE regexp_replace(p.qual, pat, rep, 'g') END;
    w := CASE WHEN p.with_check IS NULL THEN NULL ELSE regexp_replace(p.with_check, pat, rep, 'g') END;
    stmt := format('ALTER POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    IF q IS NOT NULL THEN stmt := stmt || ' USING (' || q || ')'; END IF;
    IF w IS NOT NULL THEN stmt := stmt || ' WITH CHECK (' || w || ')'; END IF;
    EXECUTE stmt;
  END LOOP;
END $$;