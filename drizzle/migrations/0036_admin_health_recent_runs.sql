CREATE OR REPLACE FUNCTION public.admin_health()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE j jsonb;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  WITH recent AS (SELECT jobid, status, start_time, runid FROM cron.job_run_details ORDER BY runid DESC LIMIT 3000),
  last AS (SELECT DISTINCT ON (jobid) jobid, status, start_time FROM recent ORDER BY jobid, runid DESC),
  fails AS (SELECT jobid, count(*) n FROM recent WHERE status = 'failed' AND start_time > now() - interval '24 hours' GROUP BY jobid)
  SELECT jsonb_build_object(
    'jobs', (SELECT coalesce(jsonb_agg(jsonb_build_object('name', c.jobname, 'schedule', c.schedule, 'active', c.active,
              'last_run', l.start_time, 'last_status', l.status, 'fails_24h', coalesce(f.n, 0)) ORDER BY c.jobname), '[]')
             FROM cron.job c LEFT JOIN last l ON l.jobid = c.jobid LEFT JOIN fails f ON f.jobid = c.jobid),
    'emails_failed_24h', (SELECT count(*) FROM public.email_send_log WHERE status IN ('failed','dlq') AND created_at > now() - interval '24 hours'),
    'emails_sent_24h', (SELECT count(*) FROM public.email_send_log WHERE status = 'sent' AND created_at > now() - interval '24 hours'),
    'needs_attention', (SELECT count(*) FROM public.bookings WHERE status = 'needs_attention'),
    'refunds_failed', (SELECT count(*) FROM public.refunds WHERE status = 'failed') + (SELECT count(*) FROM public.payment_shares WHERE status = 'refund_failed'),
    'partner', (SELECT jsonb_build_object('blocked_until', blocked_until, 'blocked_reason', blocked_reason, 'last_refresh', last_full_refresh_at) FROM public.partner_sync_state LIMIT 1)
  ) INTO j;
  RETURN j;
END $$;