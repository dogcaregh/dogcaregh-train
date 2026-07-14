import { getServerUser } from "@/lib/owner-data";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getUnreadCount } from "@/lib/notify";

export async function NotifBell() {
  const user = await getServerUser();
  if (!user) return null;
  const supabase = createServerSupabaseClient();
  const n = await getUnreadCount(supabase, user.id);

  return (
    <a href="/notifications" className="relative text-walnut hover:text-espresso" aria-label="Notifications">
      <span className="text-base">🔔</span>
      {n > 0 && (
        <span className="absolute -top-2 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-gold text-ivory text-[10px] font-bold flex items-center justify-center">
          {n > 9 ? "9+" : n}
        </span>
      )}
    </a>
  );
}
