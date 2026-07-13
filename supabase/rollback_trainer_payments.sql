-- Rollback for add_trainer_payments.sql
DROP TABLE IF EXISTS public.trainer_cashout_requests CASCADE;
ALTER TABLE public.trainer_bookings    DROP COLUMN IF EXISTS paid_at;
ALTER TABLE public.trainer_evaluations DROP COLUMN IF EXISTS trainer_payout;
ALTER TABLE public.trainer_evaluations DROP COLUMN IF EXISTS paid_at;
