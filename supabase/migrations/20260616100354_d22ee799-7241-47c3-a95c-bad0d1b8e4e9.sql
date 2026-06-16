
DROP POLICY IF EXISTS "Admins update any listing" ON public.listings;
CREATE POLICY "Admins update any listing" ON public.listings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
