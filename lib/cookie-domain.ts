// Host-aware cookie domain for the shared Supabase session.
//
// This is the SAME logic shipped and validated in DogCareGH Phase 1. The
// trainer app must scope its session cookie identically so a session set on
// dogcaregh.com is read here at train.dogcaregh.com — and so any token refresh
// this app performs writes back to the same .dogcaregh.com cookie (never a
// host-only duplicate that would break @supabase/ssr chunk reassembly).
//
// Only widen to the parent domain on real dogcaregh.com hosts; a response from
// a *.vercel.app preview or localhost cannot set a dogcaregh.com cookie, so we
// return undefined there and keep the cookie host-only (safe default).

const PARENT_DOMAIN = "dogcaregh.com";

/**
 * Returns the cookie `Domain` for a given request host, or `undefined` to leave
 * the cookie host-only.
 *
 * - `train.dogcaregh.com`, `dogcaregh.com`, `www.dogcaregh.com`, … → `"dogcaregh.com"`
 * - `*.vercel.app`, `localhost`, IPs, anything else → `undefined` (host-only)
 */
export function cookieDomainForHost(
  host: string | null | undefined
): string | undefined {
  if (!host) return undefined;
  const hostname = host.split(":")[0].trim().toLowerCase(); // strip any :port
  if (hostname === PARENT_DOMAIN || hostname.endsWith(`.${PARENT_DOMAIN}`)) {
    return PARENT_DOMAIN;
  }
  return undefined;
}

/**
 * Builds the `cookieOptions` object for the Supabase SSR clients. Only sets
 * `domain` when the host warrants it, so on preview/localhost we pass an empty
 * object and the library keeps its host-only defaults (sameSite=lax, secure).
 */
export function sessionCookieOptions(
  host: string | null | undefined
): { domain?: string } {
  const domain = cookieDomainForHost(host);
  return domain ? { domain } : {};
}
