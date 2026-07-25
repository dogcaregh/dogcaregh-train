-- Rollback live notifications — remove the table from the Realtime publication.
-- Run in Supabase SQL Editor.
ALTER PUBLICATION supabase_realtime DROP TABLE public.trainer_notifications;
