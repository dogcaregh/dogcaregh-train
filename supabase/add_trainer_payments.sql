-- ============================================================
-- Phase 4 — payments & escrow (ADDITIVE)
-- Adds payment markers + a trainer cash-out table. Mirrors the care app's
-- proven pattern (add_cashout_requests.sql). Run in Supabase SQL Editor.
-- Rollback: supabase/rollback_trainer_payments.sql
-- ============================================================

-- Payment markers (payment_ref / commission_amount / trainer_payout already
-- exist on trainer_bookings from Phase 2).
ALTER TABLE public.trainer_evaluations ADD COLUMN IF NOT EXISTS paid_at        timestamptz;
ALTER TABLE public.trainer_evaluations ADD COLUMN IF NOT EXISTS trainer_payout numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.trainer_bookings    ADD COLUMN IF NOT EXISTS paid_at        timestamptz;

-- Trainer cash-out requests (manual payout, like providers' cashout_requests).
CREATE TABLE IF NOT EXISTS public.trainer_cashout_requests (
  id           uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id   uuid          NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
  amount       numeric(10,2) NOT NULL CHECK (amount > 0),
  momo_network text          NOT NULL,
  momo_number  text          NOT NULL,
  status       text          NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'paid', 'rejected')),
  note         text,
  created_at   timestamptz   NOT NULL DEFAULT now(),
  paid_at      timestamptz
);
CREATE INDEX IF NOT EXISTS idx_trainer_cashout_trainer ON public.trainer_cashout_requests (trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_cashout_status  ON public.trainer_cashout_requests (status);

ALTER TABLE public.trainer_cashout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trainer_cashouts: trainer select" ON public.trainer_cashout_requests;
CREATE POLICY "trainer_cashouts: trainer select"
  ON public.trainer_cashout_requests FOR SELECT
  USING (trainer_id IN (SELECT id FROM public.trainer_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "trainer_cashouts: trainer insert" ON public.trainer_cashout_requests;
CREATE POLICY "trainer_cashouts: trainer insert"
  ON public.trainer_cashout_requests FOR INSERT
  WITH CHECK (trainer_id IN (SELECT id FROM public.trainer_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "trainer_cashouts: admins all" ON public.trainer_cashout_requests;
CREATE POLICY "trainer_cashouts: admins all"
  ON public.trainer_cashout_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
