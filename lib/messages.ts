import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser, relName } from "@/lib/owner-data";
import { getMyTrainerProfile } from "@/lib/trainer-data";

export type Msg = { id: string; sender_id: string; content: string; read: boolean; created_at: string };
export type ThreadSummary = {
  partnerId: string; // trainer_id (owner view) or owner_id (trainer view)
  name: string;
  avatar_url: string | null;
  last: string;
  lastAt: string;
  unread: number;
};

/** Unread messages sent TO me across all my threads. RLS scopes rows to mine. */
export async function getMyMessageUnread(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count } = await supabase
    .from("trainer_messages")
    .select("id", { count: "exact", head: true })
    .eq("read", false)
    .neq("sender_id", userId);
  return count ?? 0;
}

// ---- Owner side (partner = trainer) --------------------------------------

export async function listOwnerThreads(): Promise<ThreadSummary[]> {
  const { supabase, user } = await requireUser();
  const { data: msgs } = await supabase
    .from("trainer_messages")
    .select("trainer_id, sender_id, content, read, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  if (!msgs || msgs.length === 0) return [];

  const groups = new Map<string, { last: (typeof msgs)[number]; unread: number }>();
  for (const m of msgs) {
    const g = groups.get(m.trainer_id) ?? { last: m, unread: 0 };
    if (!m.read && m.sender_id !== user.id) g.unread += 1;
    groups.set(m.trainer_id, g); // first seen is newest (desc order)
  }

  const ids = [...groups.keys()];
  const { data: profiles } = await supabase
    .from("trainer_profiles")
    .select("id, avatar_url, users(name)")
    .in("id", ids);
  const pById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return ids
    .map((id): ThreadSummary => {
      const g = groups.get(id)!;
      const p = pById.get(id);
      return {
        partnerId: id,
        name: relName(p),
        avatar_url: (p?.avatar_url as string | null) ?? null,
        last: g.last.content,
        lastAt: g.last.created_at,
        unread: g.unread,
      };
    })
    .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
}

export async function getOwnerThread(trainerId: string) {
  const { supabase, user } = await requireUser();
  const [{ data: msgs }, { data: profile }] = await Promise.all([
    supabase
      .from("trainer_messages")
      .select("id, sender_id, content, read, created_at")
      .eq("owner_id", user.id)
      .eq("trainer_id", trainerId)
      .order("created_at", { ascending: true }),
    supabase.from("trainer_profiles").select("id, avatar_url, users(name)").eq("id", trainerId).maybeSingle(),
  ]);

  // Mark incoming messages read on open. Reached via plain <a> (no prefetch),
  // so this only runs on an actual visit.
  await supabase
    .from("trainer_messages")
    .update({ read: true })
    .eq("owner_id", user.id)
    .eq("trainer_id", trainerId)
    .eq("read", false)
    .neq("sender_id", user.id);

  return {
    messages: (msgs ?? []) as Msg[],
    name: relName(profile),
    avatar_url: (profile?.avatar_url as string | null) ?? null,
    meId: user.id,
    ownerId: user.id,
    trainerId,
  };
}

// ---- Trainer side (partner = owner) --------------------------------------

export async function listTrainerThreads(): Promise<ThreadSummary[]> {
  const profile = await getMyTrainerProfile();
  if (!profile) return [];
  const { supabase, user } = await requireUser();
  const { data: msgs } = await supabase
    .from("trainer_messages")
    .select("owner_id, sender_id, content, read, created_at")
    .eq("trainer_id", profile.id)
    .order("created_at", { ascending: false });
  if (!msgs || msgs.length === 0) return [];

  const groups = new Map<string, { last: (typeof msgs)[number]; unread: number }>();
  for (const m of msgs) {
    const g = groups.get(m.owner_id) ?? { last: m, unread: 0 };
    if (!m.read && m.sender_id !== user.id) g.unread += 1;
    groups.set(m.owner_id, g);
  }

  const ids = [...groups.keys()];
  const { data: owners } = await supabase.from("users").select("id, name").in("id", ids);
  const nameById = new Map((owners ?? []).map((o) => [o.id, o.name]));

  return ids
    .map((id): ThreadSummary => {
      const g = groups.get(id)!;
      return {
        partnerId: id,
        name: nameById.get(id) ?? "An owner",
        avatar_url: null,
        last: g.last.content,
        lastAt: g.last.created_at,
        unread: g.unread,
      };
    })
    .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
}

export async function getTrainerThread(ownerId: string) {
  const profile = await getMyTrainerProfile();
  if (!profile) return null;
  const { supabase, user } = await requireUser();
  const [{ data: msgs }, { data: owner }] = await Promise.all([
    supabase
      .from("trainer_messages")
      .select("id, sender_id, content, read, created_at")
      .eq("trainer_id", profile.id)
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: true }),
    supabase.from("users").select("name").eq("id", ownerId).maybeSingle(),
  ]);

  await supabase
    .from("trainer_messages")
    .update({ read: true })
    .eq("trainer_id", profile.id)
    .eq("owner_id", ownerId)
    .eq("read", false)
    .neq("sender_id", user.id);

  return {
    messages: (msgs ?? []) as Msg[],
    name: owner?.name ?? "An owner",
    avatar_url: null as string | null,
    meId: user.id,
    ownerId,
    trainerId: profile.id,
  };
}
