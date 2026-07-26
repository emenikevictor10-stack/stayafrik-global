
DROP POLICY IF EXISTS "guest or host reads reservation" ON public.reservations;
DROP POLICY IF EXISTS "guest or host updates reservation" ON public.reservations;
DROP POLICY IF EXISTS "admin deletes reservation" ON public.reservations;

CREATE POLICY "guest or host reads reservation" ON public.reservations
  FOR SELECT USING (auth.uid() = guest_id OR auth.uid() = host_id OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "guest or host updates reservation" ON public.reservations
  FOR UPDATE USING (auth.uid() = guest_id OR auth.uid() = host_id OR private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = guest_id OR auth.uid() = host_id OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin deletes reservation" ON public.reservations
  FOR DELETE USING (private.has_role(auth.uid(), 'admin'::app_role));
