DROP POLICY IF EXISTS "Listing images publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users update own listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own listing images" ON storage.objects;

-- Keep only the current own-folder policies for listing-images.
DROP POLICY IF EXISTS "Hosts upload listing images" ON storage.objects;
DROP POLICY IF EXISTS "Hosts update own listing images" ON storage.objects;
DROP POLICY IF EXISTS "Hosts delete own listing images" ON storage.objects;

CREATE POLICY "Hosts upload listing images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Hosts update own listing images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Hosts delete own listing images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);