import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// Signs out of the shared session. Because the cookie is scoped to
// .dogcaregh.com, this is a GLOBAL sign-out across both apps (expected).
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url));
}
