CREATE POLICY "Admins read kyc documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE UNIQUE INDEX IF NOT EXISTS payouts_one_per_booking ON public.payouts (booking_id) WHERE booking_id IS NOT NULL;

-- When a local booking's escrow is released, queue the host's share (total minus the 8% service fee) as a pending payout.
CREATE OR REPLACE FUNCTION public.queue_payout_on_release()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _host uuid;
BEGIN
  IF NEW.status = 'released' AND OLD.status IS DISTINCT FROM 'released' AND NEW.source <> 'rayprop' AND NEW.listing_id IS NOT NULL THEN
    SELECT host_id INTO _host FROM public.listings WHERE id = NEW.listing_id;
    IF _host IS NOT NULL THEN
      INSERT INTO public.payouts (host_id, booking_id, amount, currency, status)
      VALUES (_host, NEW.id, round(NEW.total_price / 1.08), 'NGN', 'pending')
      ON CONFLICT (booking_id) WHERE booking_id IS NOT NULL DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.queue_payout_on_release() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_queue_payout_on_release ON public.bookings;
CREATE TRIGGER trg_queue_payout_on_release AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.queue_payout_on_release();