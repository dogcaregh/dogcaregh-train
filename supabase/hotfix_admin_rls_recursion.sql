-- ============================================================
-- HOTFIX — RLS infinite recursion (42P17) breaking dogs reads.
--
-- add_admin_trainer_vetting's admin policies checked the role via a subquery
-- on public.users, closing an RLS cycle:
--   trainer_evaluations -> trainer_profiles -> users -> trainer_evaluations
-- which made every dogs read (owner dashboard) throw 42P17.
--
-- Fix: check admin via a SECURITY DEFINER function that runs with the
-- function owner's rights, so it does NOT re-trigger users' RLS. Cycle broken.
-- DB-only change; takes effect immediately (no redeploy).
-- Run in Supabase Dashboard → SQL Editor.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$;

DROP POLICY IF EXISTS "trainer_profiles: admins read all" ON public.trainer_profiles;
CREATE POLICY "trainer_profiles: admins read all"
  ON public.trainer_profiles FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "trainer_profiles: admins update" ON public.trainer_profiles;
CREATE POLICY "trainer_profiles: admins update"
  ON public.trainer_profiles FOR UPDATE
  USING (public.is_admin());
