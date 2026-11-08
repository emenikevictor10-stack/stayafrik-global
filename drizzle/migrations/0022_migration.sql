DROP POLICY IF EXISTS "public settings readable" ON public.app_settings;
CREATE POLICY "anon reads public settings" ON public.app_settings FOR SELECT TO anon USING (is_public);
CREATE POLICY "users read public settings, admins all" ON public.app_settings FOR SELECT TO authenticated USING (is_public OR private.has_role(auth.uid(), 'admin'));
-- admin_audit_log.actor_id is required; the trigger runs as definer so the insert is allowed
GRANT EXECUTE ON FUNCTION public.setting_int(text, int) TO authenticated, service_role;