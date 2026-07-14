-- Rollback for add_trainer_notifications.sql
DROP FUNCTION IF EXISTS public.create_trainer_notification(uuid, text, text, text);
DROP TABLE IF EXISTS public.trainer_notifications CASCADE;
