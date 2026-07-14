import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/owner-data";

const FROM = "DogTrainerGH <noreply@dogcaregh.com>";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://train.dogcaregh.com";

/**
 * Create an in-app notification for `recipient`, and (if `emailSubject` is
 * given and RESEND_API_KEY is set) also send an email. Works with either the
 * session client (server actions) or the service-role client (payment
 * callback) — the create fn is SECURITY DEFINER.
 */
export async function notify(
  supabase: SupabaseClient,
  recipient: string,
  type: string,
  message: string,
  link: string,
  emailSubject?: string
) {
  const { data: email } = await supabase.rpc("create_trainer_notification", {
    recipient,
    ntype: type,
    nmessage: message,
    nlink: link,
  });

  if (emailSubject && email && process.env.RESEND_API_KEY) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: String(email),
          subject: emailSubject,
          html: emailHtml(message, link),
        }),
      });
    } catch {
      /* email is best-effort; never block the action */
    }
  }
}

function emailHtml(message: string, link: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px">
    <div style="background:#2A1A0F;border-radius:14px 14px 0 0;padding:18px 24px;color:#FBF7F0;font-weight:700">DogTrainerGH</div>
    <div style="background:#fff;border:1px solid #E5D8C4;border-top:0;border-radius:0 0 14px 14px;padding:24px">
      <p style="font-size:15px;line-height:1.6;color:#2A1A0F;margin:0 0 14px">${message}</p>
      <a href="${SITE}${link}" style="display:inline-block;background:#452A18;color:#FBF7F0;text-decoration:none;font-weight:700;font-size:14px;padding:10px 20px;border-radius:9px">View →</a>
    </div>
  </div>`;
}

export async function getUnreadCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count } = await supabase
    .from("trainer_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  return count ?? 0;
}

export async function listMyNotifications() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("trainer_notifications")
    .select("id, type, message, link, read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}
