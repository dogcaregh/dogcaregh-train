-- ============================================================
-- Phase 5 — admin vetting (ADDITIVE)
-- Lets platform admins (users.role = 'admin') read every trainer profile
-- (incl. pending) and set vetting_status. Replaces the preview auto-verify.
-- Existing trainer_profiles policies (public read, own write) are untouched.
-- Run in Supabase SQL Editor. Rollback: rollback_admin_trainer_vetting.sql
-- ============================================================

DROP POLICY IF EXISTS "trainer_profiles: admins read all" ON public.trainer_profiles;
CREATE POLICY "trainer_profiles: admins read all"
  ON public.trainer_profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "trainer_profiles: admins update" ON public.trainer_profiles;
CREATE POLICY "trainer_profiles: admins update"
  ON public.trainer_profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
