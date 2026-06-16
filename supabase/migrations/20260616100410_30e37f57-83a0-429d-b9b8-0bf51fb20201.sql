
DROP POLICY IF EXISTS "Listing videos readable" ON storage.objects;
CREATE POLICY "Listing videos readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'listing-videos');

DROP POLICY IF EXISTS "Hosts upload own listing videos" ON storage.objects;
CREATE POLICY "Hosts upload own listing videos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Hosts update own listing videos" ON storage.objects;
CREATE POLICY "Hosts update own listing videos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Hosts delete own listing videos" ON storage.objects;
CREATE POLICY "Hosts delete own listing videos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'listing-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
