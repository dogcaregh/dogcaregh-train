-- ============================================================
-- Direct messaging (ADDITIVE). One thread per owner ↔ trainer pair.
-- A message row belongs to a thread identified by (owner_id, trainer_id);
-- sender_id is whichever party wrote it. Both parties read/write their own
-- threads; nobody else can. Run in Supabase SQL Editor.
-- Rollback: rollback_trainer_messages.sql
--
-- Note: RLS lets an owner insert to any trainer_id (owner_id = auth.uid()).
-- Cold-DM spam is prevented one layer up — the send action requires an existing
-- evaluation or booking between the two parties (see app/actions.ts sendMessage).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trainer_messages (
  id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id   uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trainer_id uuid        NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
  sender_id  uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content    text        NOT NULL CHECK (length(btrim(content)) > 0),
  read       boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trainer_messages_thread
  ON public.trainer_messages (owner_id, trainer_id, created_at);

ALTER TABLE public.trainer_messages ENABLE ROW LEVEL SECURITY;

-- Visible to the two parties of the thread: the owner, or the trainer behind
-- trainer_id. (trainer_profiles has no policy referencing trainer_messages, so
-- this subquery cannot form an RLS recursion cycle.)
DROP POLICY IF EXISTS "trainer_messages: party select" ON public.trainer_messages;
CREATE POLICY "trainer_messages: party select"
  ON public.trainer_messages FOR SELECT
  USING (
    owner_id = auth.uid()
    OR trainer_id IN (SELECT id FROM public.trainer_profiles WHERE user_id = auth.uid())
  );

-- Either party may send, but only as themselves.
DROP POLICY IF EXISTS "trainer_messages: party insert" ON public.trainer_messages;
CREATE POLICY "trainer_messages: party insert"
  ON public.trainer_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      owner_id = auth.uid()
      OR trainer_id IN (SELECT id FROM public.trainer_profiles WHERE user_id = auth.uid())
    )
  );

-- Either party may mark thread messages read.
DROP POLICY IF EXISTS "trainer_messages: party update" ON public.trainer_messages;
CREATE POLICY "trainer_messages: party update"
  ON public.trainer_messages FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR trainer_id IN (SELECT id FROM public.trainer_profiles WHERE user_id = auth.uid())
  );

-- Admins may read threads for support/dispute resolution (read-only).
DROP POLICY IF EXISTS "trainer_messages: admins read" ON public.trainer_messages;
CREATE POLICY "trainer_messages: admins read"
  ON public.trainer_messages FOR SELECT
  USING (public.is_admin());
