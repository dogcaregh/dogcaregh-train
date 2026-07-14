-- Rollback for add_admin_full_access.sql
DROP POLICY IF EXISTS "users: admins read all" ON public.users;
DROP POLICY IF EXISTS "dogs: admins read all" ON public.dogs;
DROP POLICY IF EXISTS "trainer_owner_profiles: admins read all" ON public.trainer_owner_profiles;
DROP POLICY IF EXISTS "trainer_evaluations: admins read all" ON public.trainer_evaluations;
DROP POLICY IF EXISTS "trainer_recommendations: admins read all" ON public.trainer_recommendations;
DROP POLICY IF EXISTS "trainer_bookings: admins read all" ON public.trainer_bookings;
DROP POLICY IF EXISTS "trainer_sessions: admins read all" ON public.trainer_sessions;
DROP POLICY IF EXISTS "trainer_bookings: admins update" ON public.trainer_bookings;
DROP POLICY IF EXISTS "trainer_sessions: admins update" ON public.trainer_sessions;
DROP POLICY IF EXISTS "trainer_evaluations: admins update" ON public.trainer_evaluations;
ALTER TABLE public.trainer_bookings DROP COLUMN IF EXISTS refund_flagged;
ALTER TABLE public.trainer_bookings DROP COLUMN IF EXISTS admin_note;
-- (leave trainer_cashouts admin policy as is_admin(); harmless)
