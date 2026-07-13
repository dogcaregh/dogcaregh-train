-- ============================================================
-- DEMO SEED — 3 trainers + their programs (DEV ONLY)
-- Lets the owner journey be built/tested before the real trainer
-- journey (sub-step 3) exists. All rows use FIXED UUIDs and a
-- @demo.dogtrainergh.invalid email marker so they are trivially
-- removable — see unseed_demo_trainers.sql. DELETE BEFORE GO-LIVE.
--
-- Run in Supabase Dashboard → SQL Editor.
-- ============================================================

BEGIN;

-- The users rows these trainers reference don't exist in auth.users
-- (they're demo data, not real accounts), so bypass the FK + triggers
-- just for these inserts, then restore normal enforcement.
SET session_replication_role = 'replica';

INSERT INTO public.users (id, name, email, role, is_owner, is_trainer) VALUES
  ('d0000000-0000-4000-a000-000000000001', 'DEMO · Kwesi Mensah', 'kwesi@demo.dogtrainergh.invalid', 'provider', false, true),
  ('d0000000-0000-4000-a000-000000000002', 'DEMO · Ama Owusu',    'ama@demo.dogtrainergh.invalid',   'provider', false, true),
  ('d0000000-0000-4000-a000-000000000003', 'DEMO · Yaw Boateng',  'yaw@demo.dogtrainergh.invalid',   'provider', false, true)
ON CONFLICT (id) DO NOTHING;

SET session_replication_role = 'origin';

INSERT INTO public.trainer_profiles
  (id, user_id, bio, specialties, breeds, neighbourhoods, methods, credentials, years_experience, eval_fee, vetting_status, active)
VALUES
  ('d1000000-0000-4000-a000-000000000001', 'd0000000-0000-4000-a000-000000000001',
   'Puppy foundations and obedience, calm and consistent.',
   ARRAY['Obedience','Puppy training'], ARRAY['German Shepherd','Boerboel'],
   ARRAY['East Legon','Cantonments','Airport Residential'],
   'Positive reinforcement, marker training', 'Certified (KNUST canine short course)', 6, 350, 'verified', true),
  ('d1000000-0000-4000-a000-000000000002', 'd0000000-0000-4000-a000-000000000002',
   'Behaviour and reactivity specialist. Any breed, any temperament.',
   ARRAY['Behaviour','Reactivity','Obedience'], ARRAY['All breeds'],
   ARRAY['Osu','Labone','Cantonments'],
   'LIMA, counter-conditioning', 'IAABC-informed methods', 9, 400, 'verified', true),
  ('d1000000-0000-4000-a000-000000000003', 'd0000000-0000-4000-a000-000000000003',
   'Protection and guard training for working breeds.',
   ARRAY['Protection','Guard','Obedience'], ARRAY['Boerboel','Rottweiler','German Shepherd'],
   ARRAY['Tema','Sakumono','Spintex'],
   'Structured drive-based training', '10+ yrs working dogs', 12, 300, 'verified', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.trainer_programs
  (id, trainer_id, name, description, weeks, sessions_per_week, price, discount, is_custom, active)
VALUES
  ('d2000000-0000-4000-a000-000000000001', 'd1000000-0000-4000-a000-000000000001', 'Foundation', 'Core obedience + puppy manners', 4, 2, 60, 0, false, true),
  ('d2000000-0000-4000-a000-000000000002', 'd1000000-0000-4000-a000-000000000001', 'Hyper',      'For high-energy dogs that need focus', 6, 3, 80, 10, false, true),
  ('d2000000-0000-4000-a000-000000000003', 'd1000000-0000-4000-a000-000000000002', 'Calm Canine','Reactivity + confidence building', 8, 2, 70, 0, false, true),
  ('d2000000-0000-4000-a000-000000000004', 'd1000000-0000-4000-a000-000000000002', 'Booster',    'Short refresher for the basics', 4, 2, 55, 0, false, true),
  ('d2000000-0000-4000-a000-000000000005', 'd1000000-0000-4000-a000-000000000003', 'Guardian',   'Full protection + obedience program', 10, 3, 90, 15, false, true)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Sanity: should show 3 trainers and 5 programs
SELECT (SELECT count(*) FROM public.trainer_profiles WHERE vetting_status='verified' AND id::text LIKE 'd1000000-%') AS demo_trainers,
       (SELECT count(*) FROM public.trainer_programs  WHERE id::text LIKE 'd2000000-%') AS demo_programs;
