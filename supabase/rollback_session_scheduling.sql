-- Rollback for add_session_scheduling.sql
ALTER TABLE public.trainer_sessions DROP COLUMN IF EXISTS reminder_sent;
