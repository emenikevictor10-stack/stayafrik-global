CREATE OR REPLACE FUNCTION public.admin_health()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE j jsonb;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT jsonb_build_object(
    'jobs', (SELECT coalesce(jsonb_agg(jsonb_build_object('name', c.jobname, 'schedule', c.schedule, 'active', c.active,
              'last_run', lr.start_time, 'last_status', lr.status,
              'fails_24h', (SELECT count(*) FROM (SELECT d.status, d.start_time FROM cron.job_run_details d WHERE d.jobid = c.jobid ORDER BY d.runid DESC LIMIT 300) x
                            WHERE x.status = 'failed' AND x.start_time > now() - interval '24 hours')) ORDER BY c.jobname), '[]')
             FROM cron.job c
             LEFT JOIN LATERAL (SELECT d.start_time, d.status FROM cron.job_run_details d WHERE d.jobid = c.jobid ORDER BY d.runid DESC LIMIT 1) lr ON true),
    'emails_failed_24h', (SELECT count(*) FROM public.email_send_log WHERE status IN ('failed','dlq') AND created_at > now() - interval '24 hours'),
    'emails_sent_24h', (SELECT count(*) FROM public.email_send_log WHERE status = 'sent' AND created_at > now() - interval '24 hours'),
    'needs_attention', (SELECT count(*) FROM public.bookings WHERE status = 'needs_attention'),
    'refunds_failed', (SELECT count(*) FROM public.refunds WHERE status = 'failed') + (SELECT count(*) FROM public.payment_shares WHERE status = 'refund_failed'),
    'partner', (SELECT jsonb_build_object('blocked_until', blocked_until, 'blocked_reason', blocked_reason, 'last_refresh', last_full_refresh_at) FROM public.partner_sync_state LIMIT 1)
  ) INTO j;
  RETURN j;
END $$;