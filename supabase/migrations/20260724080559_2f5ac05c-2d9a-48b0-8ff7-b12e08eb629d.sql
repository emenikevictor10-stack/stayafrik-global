ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp text, ADD COLUMN IF NOT EXISTS bio text;

DROP FUNCTION IF EXISTS public.get_public_profiles(uuid[]);

CREATE OR REPLACE FUNCTION public.get_public_profiles(_user_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text, avatar_url text, is_host boolean, whatsapp text)
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  SELECT p.user_id, p.full_name, p.avatar_url, p.is_host, p.whatsapp
  FROM public.profiles p
  WHERE p.user_id = ANY(_user_ids)
$$;