CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Unschedule existing cron jobs (if any) before dropping
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    FOR r IN SELECT jobname FROM cron.job LOOP
      PERFORM cron.unschedule(r.jobname);
    END LOOP;
  END IF;
END $$;

DROP EXTENSION IF EXISTS pg_net;
DROP EXTENSION IF EXISTS pg_cron;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Reschedule hourly auto-release job
SELECT cron.schedule(
  'auto-release-escrow-hourly',
  '0 * * * *',
  $$ SELECT extensions.http_post(
    url := 'https://esdamopsmblyknfnwrou.supabase.co/functions/v1/auto-release-escrow',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  ); $$
);