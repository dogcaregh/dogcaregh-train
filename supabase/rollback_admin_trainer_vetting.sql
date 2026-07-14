-- Rollback for add_admin_trainer_vetting.sql
DROP POLICY IF EXISTS "trainer_profiles: admins read all" ON public.trainer_profiles;
DROP POLICY IF EXISTS "trainer_profiles: admins update" ON public.trainer_profiles;
DROP FUNCTION IF EXISTS public.is_admin();
