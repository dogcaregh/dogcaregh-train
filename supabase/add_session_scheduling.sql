-- ============================================================
-- Session scheduling (ADDITIVE). trainer_sessions.scheduled_at already exists
-- (Phase 2); this only adds a reminder de-dupe flag for the daily cron.
-- Run in Supabase SQL Editor. Rollback: rollback_session_scheduling.sql
-- ============================================================
ALTER TABLE public.trainer_sessions ADD COLUMN IF NOT EXISTS reminder_sent boolean NOT NULL DEFAULT false;
