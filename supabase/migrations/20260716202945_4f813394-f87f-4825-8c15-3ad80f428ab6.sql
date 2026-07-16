
-- 1. listing-videos: restrict SELECT to authenticated users only
DROP POLICY IF EXISTS "Listing videos readable" ON storage.objects;
CREATE POLICY "Listing videos readable"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'listing-videos');

-- 2. realtime.messages: tighten topic policy to require uid as exact colon segment
DROP POLICY IF EXISTS "Authenticated users subscribe to own topics" ON realtime.messages;
CREATE POLICY "Authenticated users subscribe to own topics"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (
    (auth.uid())::text = ANY (string_to_array(realtime.topic(), ':'))
  );

-- 3. user_roles: prevent admins from granting/removing the 'admin' role via API.
-- Admins may still manage non-admin role assignments. Admin bootstrap must be
-- performed via service_role / direct DB migration.
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage non-admin roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::app_role)
    AND role <> 'admin'::app_role
  )
  WITH CHECK (
    private.has_role(auth.uid(), 'admin'::app_role)
    AND role <> 'admin'::app_role
  );

-- 4. otp_codes: add explicit documentation & belt-and-braces lockdown.
-- The table has no grants to anon/authenticated (PostgREST cannot read it) and
-- only service_role edge functions access it. Revoke any privileges just in
-- case and document the intent.
REVOKE ALL ON public.otp_codes FROM anon, authenticated;
COMMENT ON TABLE public.otp_codes IS
  'OTP verification codes. Access restricted to service_role edge functions only. code_hash stores SHA-256 of the 6-digit code; attempts capped at 5 and codes expire in 10 minutes, so brute-force of the hash is infeasible.';
