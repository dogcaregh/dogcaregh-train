-- Rollback for add_trainer_photos_bucket.sql (leaves uploaded files in place).
DROP POLICY IF EXISTS "trainer-photos: public read" ON storage.objects;
DROP POLICY IF EXISTS "trainer-photos: owner upload" ON storage.objects;
DROP POLICY IF EXISTS "trainer-photos: owner update" ON storage.objects;
DROP POLICY IF EXISTS "trainer-photos: owner delete" ON storage.objects;
-- DELETE FROM storage.buckets WHERE id = 'trainer-photos'; -- only if empty
