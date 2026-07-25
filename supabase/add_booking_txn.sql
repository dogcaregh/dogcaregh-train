-- ============================================================
-- Atomic booking creation (ADDITIVE). Inserts a booking AND all of its sessions
-- in a single transaction, so a mid-way failure can never leave an orphan
-- booking with no sessions. Replaces the app's two-step insert (which stays as
-- a fallback for environments where this function isn't applied yet).
--
-- SECURITY DEFINER, but owner_id is forced to auth.uid() — a caller can only
-- create a booking for themselves. Run in Supabase SQL Editor.
-- Rollback: rollback_booking_txn.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_booking_with_sessions(
  p_trainer_id        uuid,
  p_program_id        uuid,
  p_recommendation_id uuid,
  p_dog_ids           uuid[],
  p_sessions_total    int,
  p_gross             numeric,
  p_commission        numeric,
  p_payout            numeric,
  p_per_session       numeric
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner   uuid := auth.uid();
  v_booking uuid;
  i         int;
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.trainer_bookings
    (owner_id, trainer_id, program_id, recommendation_id, dog_id, dog_ids, status,
     sessions_total, gross_amount, commission_amount, trainer_payout)
  VALUES
    (v_owner, p_trainer_id, p_program_id, p_recommendation_id, p_dog_ids[1], p_dog_ids, 'pending',
     p_sessions_total, p_gross, p_commission, p_payout)
  RETURNING id INTO v_booking;

  FOR i IN 1..GREATEST(p_sessions_total, 0) LOOP
    INSERT INTO public.trainer_sessions (booking_id, seq, status, release_amount)
    VALUES (v_booking, i, 'scheduled', p_per_session);
  END LOOP;

  RETURN v_booking;
END; $$;

GRANT EXECUTE ON FUNCTION public.create_booking_with_sessions(uuid, uuid, uuid, uuid[], int, numeric, numeric, numeric, numeric)
  TO authenticated;
