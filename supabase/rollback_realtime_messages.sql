-- Rollback live messaging — remove trainer_messages from the Realtime publication.
-- Run in Supabase SQL Editor.
ALTER PUBLICATION supabase_realtime DROP TABLE public.trainer_messages;
