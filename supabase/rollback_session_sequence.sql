-- Rollback for add_session_sequence.sql
ALTER TABLE public.trainer_sessions DROP COLUMN IF EXISTS seq;
