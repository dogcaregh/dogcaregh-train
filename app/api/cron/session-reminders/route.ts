import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

// Daily Vercel Cron. Notifies both parties ~24h before a scheduled session.
// Secured by CRON_SECRET; no-ops without the service-role key.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ skipped: "no service role key" });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data } = await admin
    .from("trainer_sessions")
    .select("id, scheduled_at, trainer_bookings(owner_id, status, trainer_profiles(user_id))")
    .eq("status", "scheduled")
    .eq("reminder_sent", false)
    .not("scheduled_at", "is", null)
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", soon.toISOString());

  type Row = {
    id: string;
    scheduled_at: string;
    trainer_bookings:
      | { owner_id: string; status: string; trainer_profiles: { user_id: string } | { user_id: string }[] | null }
      | { owner_id: string; status: string; trainer_profiles: { user_id: string } | { user_id: string }[] | null }[]
      | null;
  };
  const rows = (data ?? []) as unknown as Row[];

  let sent = 0;
  for (const s of rows) {
    const bk = Array.isArray(s.trainer_bookings) ? s.trainer_bookings[0] : s.trainer_bookings;
    if (!bk || ["pending", "cancelled"].includes(bk.status)) continue;
    const tp = Array.isArray(bk.trainer_profiles) ? bk.trainer_profiles[0] : bk.trainer_profiles;
    const when = new Date(s.scheduled_at).toLocaleString("en-GB", {
      weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
    });

    if (bk.owner_id) await notify(admin, bk.owner_id, "session_reminder", `Reminder: your training session is ${when}.`, "/bookings", "Session reminder");
    if (tp?.user_id) await notify(admin, tp.user_id, "session_reminder", `Reminder: a session is ${when}.`, "/trainer/bookings", "Session reminder");
    await admin.from("trainer_sessions").update({ reminder_sent: true }).eq("id", s.id);
    sent++;
  }

  return NextResponse.json({ sent });
}
