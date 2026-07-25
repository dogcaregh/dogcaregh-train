-- ============================================================
-- Admin audit log (ADDITIVE). Records who did what, when — for accountability
-- on vetting, booking overrides, refund flags, cash-out decisions, and nudges.
-- Reads/inserts restricted to admins via the existing is_admin() SECURITY
-- DEFINER function. Run in Supabase SQL Editor. Rollback: rollback_admin_actions.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_actions (
  id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id   uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action     text        NOT NULL,
  detail     text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON public.admin_actions (created_at DESC);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_actions: admins read" ON public.admin_actions;
CREATE POLICY "admin_actions: admins read"
  ON public.admin_actions FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "admin_actions: admins insert" ON public.admin_actions;
CREATE POLICY "admin_actions: admins insert"
  ON public.admin_actions FOR INSERT WITH CHECK (public.is_admin() AND admin_id = auth.uid());
