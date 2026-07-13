import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieOptions } from "@/lib/cookie-domain";

// Keeps the shared Supabase session fresh on every request. Reads and (on
// refresh) writes the cookie at the SAME scope the care app uses
// (.dogcaregh.com on dogcaregh.com hosts), so the cross-subdomain session set
// on dogcaregh.com is honored here and never duplicated host-only.
//
// NOTE: unlike the DogCareGH middleware, there is deliberately NO legacy-cookie
// migration/clear step here. That one-time cleanup is the care app's job and is
// already done; the sb-domain-migrated marker is a .dogcaregh.com cookie shared
// across subdomains. This app must never clear a valid incoming session.
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!supabaseUrl.startsWith("http") || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookieOptions: sessionCookieOptions(request.nextUrl.hostname),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, responseHeaders) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
        if (responseHeaders) {
          Object.entries(responseHeaders).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          );
        }
      },
    },
  });

  const { data: { user: mwUser }, error: mwErr } = await supabase.auth.getUser();
  console.log(
    `[DIAG mw] path=${request.nextUrl.pathname} host=${request.nextUrl.hostname}` +
    ` user=${mwUser?.id ?? "null"} err=${mwErr?.message ?? "none"}` +
    ` sbcookies=${request.cookies.getAll().filter((c) => c.name.startsWith("sb-")).map((c) => c.name).join("|")}`
  );

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
