-- Reminder pass, run by the lifecycle job. Each reminder is sent once (tracked in booking_events).
CREATE OR REPLACE FUNCTION public.booking_reminders_tick()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; _ci int := 0; _ty int := 0; _hn int := 0;
BEGIN
  PERFORM set_config('app.actor', 'system', true);
  FOR r IN SELECT b.id, b.guest_id, b.check_in_date, coalesce(l.title, b.partner_title, 'your stay') t, coalesce(b.listing_code, '') code
           FROM public.bookings b LEFT JOIN public.listings l ON l.id = b.listing_id
           WHERE b.status IN ('confirmed','released') AND b.check_in_date = current_date + 1
             AND NOT EXISTS (SELECT 1 FROM public.booking_events e WHERE e.booking_id = b.id AND e.type = 'reminder_checkin') LOOP
    PERFORM public.log_booking_event(r.id, 'reminder_checkin', 'system', '{}'::jsonb);
    INSERT INTO public.notifications(user_id, type, title, body, link) VALUES (r.guest_id, 'booking', 'Check-in is tomorrow', r.t || ' — the address and check-in time are in your trip.', '/trips/' || r.id);
    PERFORM public.send_alert_email(r.guest_id, 'Check-in tomorrow: ' || r.t, 'Your check-in is tomorrow', r.t || CASE WHEN r.code <> '' THEN ' (' || r.code || ')' ELSE '' END || '. The address and check-in time are in your trip.', '/trips/' || r.id);
    _ci := _ci + 1;
  END LOOP;
  FOR r IN SELECT b.id, b.guest_id, coalesce(l.title, b.partner_title, 'your stay') t
           FROM public.bookings b LEFT JOIN public.listings l ON l.id = b.listing_id
           WHERE b.status IN ('completed','released') AND b.check_out_date BETWEEN current_date - 3 AND current_date - 1
             AND NOT EXISTS (SELECT 1 FROM public.booking_events e WHERE e.booking_id = b.id AND e.type = 'thank_you') LOOP
    PERFORM public.log_booking_event(r.id, 'thank_you', 'system', '{}'::jsonb);
    INSERT INTO public.notifications(user_id, type, title, body, link) VALUES (r.guest_id, 'booking', 'Thanks for staying', 'How was ' || r.t || '? A short review helps other guests.', '/trips/' || r.id || '/review');
    _ty := _ty + 1;
  END LOOP;
  FOR r IN SELECT b.id, b.host_id FROM public.bookings b
           WHERE b.status = 'awaiting_host' AND b.host_id IS NOT NULL AND b.host_respond_by BETWEEN now() AND now() + interval '4 hours'
             AND NOT EXISTS (SELECT 1 FROM public.booking_events e WHERE e.booking_id = b.id AND e.type = 'host_deadline_nudge') LOOP
    PERFORM public.log_booking_event(r.id, 'host_deadline_nudge', 'system', '{}'::jsonb);
    INSERT INTO public.notifications(user_id, type, title, body, link) VALUES (r.host_id, 'booking_request', 'Booking request closing soon', 'Accept or decline within 4 hours or the guest is refunded.', '/host/requests');
    PERFORM public.send_alert_email(r.host_id, 'A booking request closes soon', 'Reply within 4 hours', 'A guest has paid and is waiting. Accept or decline before the time runs out, or they will be refunded.', '/host/requests');
    _hn := _hn + 1;
  END LOOP;
  RETURN jsonb_build_object('checkin_reminders', _ci, 'thank_yous', _ty, 'host_nudges', _hn);
END $$;
REVOKE ALL ON FUNCTION public.booking_reminders_tick() FROM PUBLIC, anon, authenticated;

-- Admin health snapshot.
CREATE OR REPLACE FUNCTION public.admin_health()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE j jsonb;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT jsonb_build_object(
    'jobs', (SELECT coalesce(jsonb_agg(jsonb_build_object('name', j.jobname, 'schedule', j.schedule, 'active', j.active,
              'last_run', (SELECT max(d.start_time) FROM cron.job_run_details d WHERE d.jobid = j.jobid),
              'last_status', (SELECT d.status FROM cron.job_run_details d WHERE d.jobid = j.jobid ORDER BY d.start_time DESC LIMIT 1),
              'fails_24h', (SELECT count(*) FROM cron.job_run_details d WHERE d.jobid = j.jobid AND d.status = 'failed' AND d.start_time > now() - interval '24 hours')) ORDER BY j.jobname), '[]') FROM cron.job j),
    'emails_failed_24h', (SELECT count(*) FROM public.email_send_log WHERE status IN ('failed','dlq') AND created_at > now() - interval '24 hours'),
    'emails_sent_24h', (SELECT count(*) FROM public.email_send_log WHERE status = 'sent' AND created_at > now() - interval '24 hours'),
    'needs_attention', (SELECT count(*) FROM public.bookings WHERE status = 'needs_attention'),
    'refunds_failed', (SELECT count(*) FROM public.refunds WHERE status = 'failed') + (SELECT count(*) FROM public.payment_shares WHERE status = 'refund_failed'),
    'partner', (SELECT jsonb_build_object('blocked_until', blocked_until, 'blocked_reason', blocked_reason, 'last_refresh', last_full_refresh_at) FROM public.partner_sync_state LIMIT 1)
  ) INTO j;
  RETURN j;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_health() TO authenticated;

-- Admin insights for a period, compared with the period before it. Money in naira.
CREATE OR REPLACE FUNCTION public.admin_insights(_from date, _to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE len int := greatest(1, _to - _from + 1); pf date := _from - len; pt date := _from - 1; j jsonb;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  WITH paid AS (SELECT * FROM public.bookings WHERE paid_at IS NOT NULL OR status IN ('confirmed','released','completed','awaiting_host')),
  cur AS (SELECT * FROM paid WHERE created_at::date BETWEEN _from AND _to),
  prev AS (SELECT * FROM paid WHERE created_at::date BETWEEN pf AND pt),
  started AS (SELECT * FROM public.bookings WHERE created_at::date BETWEEN _from AND _to)
  SELECT jsonb_build_object(
    'current', jsonb_build_object('bookings', (SELECT count(*) FROM cur), 'gross', (SELECT coalesce(sum(total_price),0) FROM cur),
       'fees', (SELECT coalesce(sum(coalesce(fee_kobo,0) + coalesce(markup_kobo,0)),0)/100.0 FROM cur),
       'host_payouts', (SELECT coalesce(sum(host_payout_kobo),0)/100.0 FROM cur), 'nights', (SELECT coalesce(sum(check_out_date - check_in_date),0) FROM cur)),
    'previous', jsonb_build_object('bookings', (SELECT count(*) FROM prev), 'gross', (SELECT coalesce(sum(total_price),0) FROM prev),
       'fees', (SELECT coalesce(sum(coalesce(fee_kobo,0) + coalesce(markup_kobo,0)),0)/100.0 FROM prev),
       'host_payouts', (SELECT coalesce(sum(host_payout_kobo),0)/100.0 FROM prev), 'nights', (SELECT coalesce(sum(check_out_date - check_in_date),0) FROM prev)),
    'funnel', jsonb_build_object('started', (SELECT count(*) FROM started),
       'paid', (SELECT count(*) FROM started WHERE paid_at IS NOT NULL OR status IN ('confirmed','released','completed','awaiting_host')),
       'cancelled', (SELECT count(*) FROM started WHERE status IN ('cancelled','refunded','declined')),
       'abandoned', (SELECT count(*) FROM started WHERE status = 'expired')),
    'by_day', (SELECT coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'bookings', (SELECT count(*) FROM cur WHERE created_at::date = d::date), 'gross', (SELECT coalesce(sum(total_price),0) FROM cur WHERE created_at::date = d::date)) ORDER BY d), '[]')
               FROM generate_series(_from, _to, interval '1 day') d),
    'by_source', (SELECT coalesce(jsonb_object_agg(source, n), '{}') FROM (SELECT source, count(*) n FROM cur GROUP BY source) s)
  ) INTO j;
  RETURN j;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_insights(date, date) TO authenticated;