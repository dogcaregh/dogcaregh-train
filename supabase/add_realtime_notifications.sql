-- ============================================================
-- Live notifications (ADDITIVE). Add trainer_notifications to the Supabase
-- Realtime publication so the in-app bell updates in place when a new
-- notification is inserted. Idempotent; the care app's tables are untouched.
-- RLS ("own select") already restricts each subscriber to their own rows.
-- Run in Supabase SQL Editor. Rollback: rollback_realtime_notifications.sql
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'trainer_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trainer_notifications;
  END IF;
END $$;
