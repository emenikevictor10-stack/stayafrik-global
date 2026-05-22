
-- 1) Profiles: stop exposing email/phone to all authenticated users
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Safe public view (no email/phone) for looking up other users
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT user_id, full_name, avatar_url, is_host
FROM public.profiles;

ALTER VIEW public.public_profiles OWNER TO postgres;
GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- 2) user_roles: prevent self-assignment of arbitrary roles
DROP POLICY IF EXISTS "Users insert own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users delete own roles" ON public.user_roles;
-- Role assignment is handled exclusively by the SECURITY DEFINER trigger handle_new_user.

-- 3) Realtime: restrict topic subscriptions to topics tied to the user's own auth.uid()
DROP POLICY IF EXISTS "Authenticated users subscribe to own topics" ON realtime.messages;
CREATE POLICY "Authenticated users subscribe to own topics"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE '%' || auth.uid()::text || '%'
);
