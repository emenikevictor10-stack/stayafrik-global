
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS released_at timestamptz;

CREATE OR REPLACE FUNCTION public.notify_on_release()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _host uuid; _title text;
BEGIN
  IF NEW.status = 'released' AND (OLD.status IS DISTINCT FROM 'released') THEN
    SELECT host_id, title INTO _host, _title FROM public.listings WHERE id = NEW.listing_id;
    IF _host IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (_host, 'payout', 'Funds released 🎉', 'Escrow released for: ' || COALESCE(_title,'your booking'), '/escrow');
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_release ON public.bookings;
CREATE TRIGGER trg_notify_release
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_on_release();

-- Auto-release: any confirmed booking whose checkout was >24h ago
CREATE OR REPLACE FUNCTION public.auto_release_due_bookings()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count integer;
BEGIN
  WITH upd AS (
    UPDATE public.bookings
    SET status = 'released', released_at = now()
    WHERE status = 'confirmed'
      AND check_out_date < (current_date - INTERVAL '1 day')
    RETURNING 1
  )
  SELECT count(*) INTO _count FROM upd;
  RETURN _count;
END; $$;

REVOKE EXECUTE ON FUNCTION public.notify_on_release() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_release_due_bookings() FROM PUBLIC, anon, authenticated;
