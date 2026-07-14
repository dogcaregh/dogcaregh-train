import { getServerUser } from "@/lib/owner-data";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getUnreadCount } from "@/lib/notify";
import { NotifDropdown } from "@/components/notif-dropdown";

export async function NotifBell() {
  const user = await getServerUser();
  if (!user) return null;
  const supabase = createServerSupabaseClient();

  const [{ data }, unread] = await Promise.all([
    supabase
      .from("trainer_notifications")
      .select("id, message, link, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
    getUnreadCount(supabase, user.id),
  ]);

  return <NotifDropdown items={data ?? []} unread={unread} />;
}
