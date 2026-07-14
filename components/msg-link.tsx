import { getServerUser } from "@/lib/owner-data";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getMyMessageUnread } from "@/lib/messages";

/** "Messages" nav link with an unread badge. `href` differs per app side. */
export async function MsgLink({ href }: { href: string }) {
  const user = await getServerUser();
  if (!user) return null;
  const supabase = createServerSupabaseClient();
  const unread = await getMyMessageUnread(supabase, user.id);
  return (
    <a href={href} className="relative text-walnut hover:text-espresso">
      Messages
      {unread > 0 && (
        <span className="absolute -top-2 -right-3 min-w-4 h-4 px-1 rounded-full bg-mahogany text-ivory text-[10px] font-bold grid place-items-center">
          {unread}
        </span>
      )}
    </a>
  );
}
