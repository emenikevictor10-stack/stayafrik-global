DROP POLICY IF EXISTS "Listing images are public" ON storage.objects;
DROP POLICY IF EXISTS "Users view own listing image metadata" ON storage.objects;

CREATE POLICY "Users view own listing image metadata"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);