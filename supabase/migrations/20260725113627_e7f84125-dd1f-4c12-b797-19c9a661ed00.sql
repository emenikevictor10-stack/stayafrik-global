
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_id UUID NOT NULL,
  visit_at TIMESTAMPTZ,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired','cancelled')),
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX reservations_listing_idx ON public.reservations(listing_id);
CREATE INDEX reservations_guest_idx ON public.reservations(guest_id);
CREATE INDEX reservations_host_idx ON public.reservations(host_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guest creates own reservation"
  ON public.reservations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = guest_id);

CREATE POLICY "guest or host reads reservation"
  ON public.reservations FOR SELECT TO authenticated
  USING (auth.uid() = guest_id OR auth.uid() = host_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "guest or host updates reservation"
  ON public.reservations FOR UPDATE TO authenticated
  USING (auth.uid() = guest_id OR auth.uid() = host_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = guest_id OR auth.uid() = host_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "admin deletes reservation"
  ON public.reservations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notify host on new reservation request
CREATE OR REPLACE FUNCTION public.notify_on_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE _title text;
BEGIN
  SELECT title INTO _title FROM public.listings WHERE id = NEW.listing_id;
  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (NEW.host_id, 'reservation', 'New viewing request', 'A guest requested a 4h hold on: ' || COALESCE(_title,'your listing'), '/reservations');
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_on_reservation
  AFTER INSERT ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_reservation();

-- Notify guest on approval/rejection & auto-set expires_at on approval
CREATE OR REPLACE FUNCTION public.on_reservation_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE _title text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  SELECT title INTO _title FROM public.listings WHERE id = NEW.listing_id;

  IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    NEW.approved_at := now();
    NEW.expires_at := now() + INTERVAL '4 hours';
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (NEW.guest_id, 'reservation', 'Viewing approved 🎉', 'Your 4h hold is active for: ' || COALESCE(_title,'the listing'), '/reservations');
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (NEW.guest_id, 'reservation', 'Viewing request declined', 'Host declined your request for: ' || COALESCE(_title,'the listing'), '/reservations');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_on_reservation_status_change
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.on_reservation_status_change();
