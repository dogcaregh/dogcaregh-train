-- ============================================================
-- Admin dashboard — full read + override access (ADDITIVE)
-- All admin checks use public.is_admin() (SECURITY DEFINER, from
-- add_admin_trainer_vetting.sql) which bypasses users RLS, so these policies
-- CANNOT form a recursion cycle. Existing per-user policies are untouched.
-- Run in Supabase SQL Editor. Rollback: rollback_admin_full_access.sql
-- ============================================================

-- Booking override fields
ALTER TABLE public.trainer_bookings ADD COLUMN IF NOT EXISTS admin_note     text;
ALTER TABLE public.trainer_bookings ADD COLUMN IF NOT EXISTS refund_flagged boolean NOT NULL DEFAULT false;

-- Admin SELECT on everything the dashboard reads
DROP POLICY IF EXISTS "users: admins read all" ON public.users;
CREATE POLICY "users: admins read all" ON public.users FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "dogs: admins read all" ON public.dogs;
CREATE POLICY "dogs: admins read all" ON public.dogs FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "trainer_owner_profiles: admins read all" ON public.trainer_owner_profiles;
CREATE POLICY "trainer_owner_profiles: admins read all" ON public.trainer_owner_profiles FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "trainer_evaluations: admins read all" ON public.trainer_evaluations;
CREATE POLICY "trainer_evaluations: admins read all" ON public.trainer_evaluations FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "trainer_recommendations: admins read all" ON public.trainer_recommendations;
CREATE POLICY "trainer_recommendations: admins read all" ON public.trainer_recommendations FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "trainer_bookings: admins read all" ON public.trainer_bookings;
CREATE POLICY "trainer_bookings: admins read all" ON public.trainer_bookings FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "trainer_sessions: admins read all" ON public.trainer_sessions;
CREATE POLICY "trainer_sessions: admins read all" ON public.trainer_sessions FOR SELECT USING (public.is_admin());

-- Admin UPDATE for booking-flow overrides
DROP POLICY IF EXISTS "trainer_bookings: admins update" ON public.trainer_bookings;
CREATE POLICY "trainer_bookings: admins update" ON public.trainer_bookings FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "trainer_sessions: admins update" ON public.trainer_sessions;
CREATE POLICY "trainer_sessions: admins update" ON public.trainer_sessions FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "trainer_evaluations: admins update" ON public.trainer_evaluations;
CREATE POLICY "trainer_evaluations: admins update" ON public.trainer_evaluations FOR UPDATE USING (public.is_admin());

-- Cash-outs: replace the Phase-4 inline-EXISTS admin policy with is_admin()
DROP POLICY IF EXISTS "trainer_cashouts: admins all" ON public.trainer_cashout_requests;
CREATE POLICY "trainer_cashouts: admins all" ON public.trainer_cashout_requests FOR ALL USING (public.is_admin());
