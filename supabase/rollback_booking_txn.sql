-- Rollback atomic booking creation. Run in Supabase SQL Editor.
DROP FUNCTION IF EXISTS public.create_booking_with_sessions(uuid, uuid, uuid, uuid[], int, numeric, numeric, numeric, numeric);
