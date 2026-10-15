GRANT SELECT ON public.listings TO anon;
CREATE POLICY "Public can view approved listings" ON public.listings FOR SELECT TO anon USING (verified = true AND is_available = true);
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO anon;

CREATE TABLE public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  amount numeric NOT NULL,
  reason text,
  initiated_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  paystack_reference text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.refunds TO authenticated;
GRANT ALL ON public.refunds TO service_role;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guest views own refunds" ON public.refunds FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.guest_id = auth.uid()));
CREATE POLICY "Admins view refunds" ON public.refunds FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));