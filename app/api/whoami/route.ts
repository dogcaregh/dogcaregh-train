import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// Server-side proof that the shared session is readable here too.
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return NextResponse.json({
    authenticated: Boolean(user),
    email: user?.email ?? null,
    id: user?.id ?? null,
  });
}
