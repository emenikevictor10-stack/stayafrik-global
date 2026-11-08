
DROP POLICY "Admins read all issues" ON public.support_issues;
CREATE POLICY "Admins read all issues" ON public.support_issues FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY "Admins read all issue events" ON public.support_issue_events;
CREATE POLICY "Admins read all issue events" ON public.support_issue_events FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY "Admins read issue photos" ON storage.objects;
CREATE POLICY "Admins read issue photos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'issue-photos' AND private.has_role(auth.uid(), 'admin'::public.app_role));
