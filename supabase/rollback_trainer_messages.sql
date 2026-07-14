-- Rollback for add_trainer_messages.sql
DROP POLICY IF EXISTS "trainer_messages: party select" ON public.trainer_messages;
DROP POLICY IF EXISTS "trainer_messages: party insert" ON public.trainer_messages;
DROP POLICY IF EXISTS "trainer_messages: party update" ON public.trainer_messages;
DROP POLICY IF EXISTS "trainer_messages: admins read" ON public.trainer_messages;
DROP TABLE IF EXISTS public.trainer_messages;
