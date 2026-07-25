-- Rollback the admin audit log. Run in Supabase SQL Editor.
DROP TABLE IF EXISTS public.admin_actions;
