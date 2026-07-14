-- ============================================================
-- Trainer photos storage (ADDITIVE). Mirrors the care app's provider-photos
-- bucket. Files are stored under <uid>/... so each trainer manages only their
-- own. Public read (marketplace). avatar_url/gallery_photos columns already
-- exist on trainer_profiles (Phase 2).
-- Run in Supabase SQL Editor. Rollback: rollback_trainer_photos_bucket.sql
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('trainer-photos', 'trainer-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "trainer-photos: public read" ON storage.objects;
CREATE POLICY "trainer-photos: public read"
  ON storage.objects FOR SELECT USING (bucket_id = 'trainer-photos');

DROP POLICY IF EXISTS "trainer-photos: owner upload" ON storage.objects;
CREATE POLICY "trainer-photos: owner upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'trainer-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "trainer-photos: owner update" ON storage.objects;
CREATE POLICY "trainer-photos: owner update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'trainer-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "trainer-photos: owner delete" ON storage.objects;
CREATE POLICY "trainer-photos: owner delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'trainer-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
