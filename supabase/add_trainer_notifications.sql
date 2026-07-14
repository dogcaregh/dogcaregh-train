-- ============================================================
-- Notifications (ADDITIVE). Mirrors the care app's notifications pattern.
-- Inserts go through a SECURITY DEFINER function so one party (e.g. an owner)
-- can notify another (the trainer) without a permissive INSERT policy.
-- Recipients read/update only their own rows.
-- Run in Supabase SQL Editor. Rollback: rollback_trainer_notifications.sql
-- TODO(hardening): the create fn is callable by any authenticated user; a
-- future guard could require caller/recipient to share a booking. Low-risk v1.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trainer_notifications (
  id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       text        NOT NULL,
  message    text        NOT NULL,
  link       text,
  read       boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trainer_notif_user ON public.trainer_notifications (user_id, read);

ALTER TABLE public.trainer_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trainer_notifications: own select" ON public.trainer_notifications;
CREATE POLICY "trainer_notifications: own select"
  ON public.trainer_notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "trainer_notifications: own update" ON public.trainer_notifications;
CREATE POLICY "trainer_notifications: own update"
  ON public.trainer_notifications FOR UPDATE USING (auth.uid() = user_id);

-- Inserts a notification for any recipient; returns their email (for the
-- optional email step). SECURITY DEFINER → bypasses the table's RLS.
CREATE OR REPLACE FUNCTION public.create_trainer_notification(
  recipient uuid, ntype text, nmessage text, nlink text
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text;
BEGIN
  INSERT INTO public.trainer_notifications (user_id, type, message, link)
  VALUES (recipient, ntype, nmessage, nlink);
  SELECT email INTO v_email FROM public.users WHERE id = recipient;
  RETURN v_email;
END; $$;

GRANT EXECUTE ON FUNCTION public.create_trainer_notification(uuid, text, text, text)
  TO authenticated, service_role;
