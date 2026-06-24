CREATE OR REPLACE FUNCTION public.get_public_profiles(_user_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text, avatar_url text, is_host boolean)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.avatar_url, p.is_host
  FROM public.profiles p
  WHERE p.user_id = ANY(_user_ids)
$$;

REVOKE ALL ON FUNCTION public.get_public_profiles(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO service_role;

DROP POLICY IF EXISTS "No client access to otp codes" ON public.otp_codes;
CREATE POLICY "No client access to otp codes"
ON public.otp_codes
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);