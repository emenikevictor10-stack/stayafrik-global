-- lovable-cron-fallback-reviewed: 15-min reply SLA needs a time-based check; job arms only while problems are open and unschedules itself when none are pending
ALTER TABLE public.support_issues
  ADD COLUMN overdue_alerted_at timestamptz,
  ADD COLUMN credit_naira numeric,
  ADD COLUMN credit_reason text;

CREATE OR REPLACE FUNCTION public.support_issue_tick()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE i record; n_over int := 0; n_closed int := 0;
BEGIN
  FOR i IN SELECT * FROM public.support_issues
    WHERE status IN ('received','in_progress') AND reply_due_at < now() AND overdue_alerted_at IS NULL
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.support_issues SET overdue_alerted_at = now() WHERE id = i.id;
    PERFORM public.notify_admins('Overdue: ' || i.ref || CASE WHEN i.urgent THEN ' (urgent)' ELSE '' END,
      'Nobody has replied in time. ' || initcap(i.category) || ' problem.', '/admin/support?id=' || i.id::text);
    n_over := n_over + 1;
  END LOOP;

  FOR i IN SELECT * FROM public.support_issues
    WHERE status = 'asked_fixed' AND asked_fixed_at < now() - interval '24 hours'
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.support_issues SET status = 'closed', closed_at = now() WHERE id = i.id;
    INSERT INTO public.support_issue_events(issue_id, author_type, kind, body)
    VALUES (i.id, 'system', 'status', 'No answer in 24 hours, so we closed it. Reply here if it is still a problem.');
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (i.user_id, 'support', 'Problem ' || i.ref || ' closed', 'We closed it after 24 hours. Tell us how we did.', '/issues/' || i.id::text);
    n_closed := n_closed + 1;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM public.support_issues
      WHERE (status IN ('received','in_progress') AND overdue_alerted_at IS NULL) OR status = 'asked_fixed') THEN
    BEGIN PERFORM cron.unschedule('support-issue-tick'); EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  RETURN jsonb_build_object('overdue_alerted', n_over, 'auto_closed', n_closed);
END $$;
REVOKE EXECUTE ON FUNCTION public.support_issue_tick() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.support_issue_watch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.reply_due_at IS DISTINCT FROM OLD.reply_due_at THEN NEW.overdue_alerted_at := NULL; END IF;
  IF NEW.status IN ('received','in_progress','asked_fixed')
     AND NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'support-issue-tick') THEN
    BEGIN
      PERFORM cron.schedule('support-issue-tick', '*/5 * * * *', 'SELECT public.support_issue_tick();');
    EXCEPTION WHEN OTHERS THEN RAISE WARNING 'support tick schedule failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_support_issue_watch BEFORE INSERT OR UPDATE ON public.support_issues
FOR EACH ROW EXECUTE FUNCTION public.support_issue_watch();

CREATE OR REPLACE FUNCTION public.staff_offer_credit(_issue_id uuid, _amount numeric, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE i record; _r text := left(btrim(coalesce(_reason,'')), 500);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount > 10000000 THEN RAISE EXCEPTION 'Enter an amount above zero'; END IF;
  IF length(_r) = 0 THEN RAISE EXCEPTION 'Add a reason'; END IF;
  SELECT * INTO i FROM public.support_issues WHERE id = _issue_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Problem not found'; END IF;
  UPDATE public.support_issues SET credit_naira = round(_amount), credit_reason = _r WHERE id = i.id;
  INSERT INTO public.support_issue_events(issue_id, author_type, author_id, kind, body)
  VALUES (i.id, 'staff', auth.uid(), 'message',
    'We''ve added a ₦' || to_char(round(_amount), 'FM999,999,999') || ' credit for you: ' || _r || '. Our team will apply it to your next booking.');
  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (i.user_id, 'support', 'Credit added (' || i.ref || ')', '₦' || to_char(round(_amount), 'FM999,999,999') || ' credit for your next stay', '/issues/' || i.id::text);
  INSERT INTO public.admin_audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'support.offer_credit', 'support_issue', i.id::text,
    jsonb_build_object('ref', i.ref, 'before', i.credit_naira, 'after', round(_amount), 'reason', _r));
END $$;
REVOKE EXECUTE ON FUNCTION public.staff_offer_credit(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_offer_credit(uuid, numeric, text) TO authenticated;
