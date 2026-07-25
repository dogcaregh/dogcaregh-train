# DogTrainerGH

Managed dog-training marketplace at **train.dogcaregh.com** — sister app to
[DogCareGH](https://dogcaregh.com). Separate repo + separate Vercel project,
**sharing the DogCareGH Supabase project** (auth session, `users`, and `dogs`
are shared; the `trainer_*` tables are owned by this app).

## What it does

A three-sided marketplace connecting dog owners with vetted trainers, with
payments held in escrow and released per session.

### Owners
- Browse trainers ranked by fit (neighbourhood, breed, specialty, budget) and
  view profiles, ratings, and photo galleries.
- Complete an intake questionnaire (goal, budget, schedule, neighbourhood) that
  drives ranking.
- Book & pay for an evaluation, review the trainer's program recommendation,
  and accept it into an escrow booking.
- Track session-by-session progress, message the trainer, get notifications,
  and leave a review once the program is complete.

### Trainers
- Set up a profile (bio, specialties, breeds, credentials, eval fee, avatar +
  gallery) — discoverable only after admin vetting.
- Publish standard programs; send standard or custom recommendations to leads.
- Schedule evaluations and sessions (single or pattern-based auto-schedule);
  mark sessions complete to release escrow.
- View earnings (net of 15% commission) and request MoMo cash-outs.

### Admin
- Vet trainers, override booking status, flag refunds, process cash-outs, and
  browse users.

## Money & escrow

- Platform commission is **15%** on everything (`lib/pricing.ts`).
- Payments go through **Paystack** (reusing DogCareGH's account), verified on
  our own `/payment/callback` rather than a webhook, so the care app's single
  Paystack webhook stays untouched. Trainer references are prefixed
  `dogtrain_` for reconciliation.
- **Stub mode:** when `PAYSTACK_SECRET_KEY` is unset, evaluations/bookings are
  auto-marked paid so the flow stays testable in preview.
- Per session, the trainer's net share accrues to their balance only when the
  session is marked complete; cash-outs are approved/paid by an admin.

## Auth & session sharing

The session cookie is scoped host-aware exactly as in DogCareGH
(`lib/cookie-domain.ts`): `.dogcaregh.com` on real dogcaregh.com hosts,
host-only on previews/localhost. `middleware.ts` keeps the shared session fresh
and deliberately does **no** legacy-cookie migration (that's the care app's
job). Owners arrive already signed in via the shared subdomain session;
trainers get a trainer-flagged role at `/signup`.

## Environment

Copy `.env.example` → `.env.local` and fill in. Public vars use the **same**
values as DogCareGH. See `.env.example` for the full list and notes:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — shared project
- `NEXT_PUBLIC_SITE_URL` — `https://train.dogcaregh.com` (prod)
- `SUPABASE_SERVICE_ROLE_KEY` — reminder cron + payment callback
- `PAYSTACK_SECRET_KEY` — live payments (unset ⇒ stub mode)
- `RESEND_API_KEY` — notification emails (optional)
- `CRON_SECRET` — protects the reminder cron endpoint

Set the public vars for **every** Vercel environment (Production, Preview) —
they are inlined at build time.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build check
npm run lint
```

## Database (Supabase)

Schema changes live in `supabase/` as additive `add_*.sql` migrations, each with
a matching `rollback_*.sql`. Run them in the Supabase SQL Editor against the
shared DogCareGH project. The `users` and `dogs` tables are owned by DogCareGH
and are **not** created here.

There is a defensive fallback in the booking reads for the `seq` column
(`supabase/add_session_sequence.sql`) so the app works before that migration is
applied; it can be removed once the migration is confirmed in production.

## Supabase Auth setup (additive — do not remove existing entries)

Add to the Redirect URL allowlist: `https://train.dogcaregh.com/**` (and the
preview URL during validation). Site URL stays unchanged.

## Cron

`vercel.json` schedules two Vercel Crons (both require `SUPABASE_SERVICE_ROLE_KEY`
and, if set, a `CRON_SECRET` bearer token):

- `/api/cron/session-reminders` — daily at 08:00 UTC (Ghana is UTC+0), notifies
  both parties ~24h before a scheduled session.
- `/api/cron/payment-reconcile` — hourly. Backstop for lost payment redirects:
  re-verifies recent successful Paystack transactions and applies any whose
  `/payment/callback` redirect never landed (money taken but record still
  unpaid). Acts only on our `dogtrain_`-prefixed references, so the shared
  Paystack account's care-app transactions are never touched. (On the Vercel
  Hobby plan, which limits crons to once/day, change this to a daily schedule —
  the 2-day re-check window still catches everything.)

Payments in production go through Paystack; if the key is missing there, checkout
is refused rather than stubbed (see `stubCheckoutAllowed`).
