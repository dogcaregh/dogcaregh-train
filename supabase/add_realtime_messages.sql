-- ============================================================
-- Live messaging (ADDITIVE). Add trainer_messages to the Supabase Realtime
-- publication so an open chat thread receives new messages in place. Idempotent;
-- the care app's tables are untouched. RLS already limits each subscriber to
-- threads they're a party to. Run in Supabase SQL Editor.
-- Rollback: rollback_realtime_messages.sql
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'trainer_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trainer_messages;
  END IF;
END $$;
