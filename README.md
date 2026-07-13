# DogTrainerGH

Managed dog-training marketplace at **train.dogcaregh.com** — sister app to
[DogCareGH](https://dogcaregh.com). Separate repo + separate Vercel project,
**sharing the DogCareGH Supabase project**.

## Phase 3 — sub-step 1: auth slice (current)

This is the thin vertical slice that proves the integration before any product
features are built:

- `/` — reads the shared `.dogcaregh.com` Supabase session and shows whether
  you arrived already signed in (the subdomain-SSO proof).
- `/signup` — fresh trainer sign-up (email/password + email confirmation).
- `/auth/callback` — PKCE / email-confirmation code exchange.
- `/api/whoami` — server-side session read (JSON).
- `/logout` — global sign-out (clears the shared cookie on both apps).

The session cookie is scoped host-aware exactly as in DogCareGH Phase 1
(`lib/cookie-domain.ts`): `.dogcaregh.com` on real dogcaregh.com hosts,
host-only on previews/localhost.

## Environment

Copy `.env.example` → `.env.local` and fill with the **same** values as
DogCareGH:

- `NEXT_PUBLIC_SUPABASE_URL` — same Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — same anon key
- `NEXT_PUBLIC_SITE_URL` — `https://train.dogcaregh.com` (prod)

Set these for **every** Vercel environment (Production, Preview) — they are
inlined at build time.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build check
```

## Supabase Auth setup (additive — do not remove existing entries)

Add to the Redirect URL allowlist: `https://train.dogcaregh.com/**` (and the
preview URL during validation). Site URL stays unchanged.
