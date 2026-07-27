import Link from "next/link";
import { headers } from "next/headers";
import { signOutAction } from "@/app/actions";
import { isAdmin } from "@/lib/admin";
import { getServerUser, getMyDogs, getMyOwnerProfile, getFeaturedTrainers } from "@/lib/owner-data";
import { cedis } from "@/lib/pricing";

// Always read the live session — never statically cache this page.
export const dynamic = "force-dynamic";

const CARE_APP = "https://dogcaregh.com";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://train.dogcaregh.com";

export default async function Home() {
  // Return the new owner to whichever host they're on (trainpreview now,
  // train.dogcaregh.com after cutover) — both are *.dogcaregh.com.
  const host = headers().get("host");
  const returnBase = host ? `https://${host}` : SITE_URL;
  const registerUrl = `${CARE_APP}/register/owner?return_to=${encodeURIComponent(`${returnBase}/onboarding`)}`;

  const user = await getServerUser();

  if (!user) {
    const featured = await getFeaturedTrainers(3);
    return (
      <main className="min-h-screen">
        {/* Hero — dog photo blended at 50% behind the content */}
        <section className="relative isolate overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/storm.jpg" alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-50" />
          {/* soft ivory wash at the edges keeps the text crisp */}
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-ivory/50 via-transparent to-ivory" aria-hidden="true" />
          <div className="mx-auto max-w-3xl px-6 pt-16 pb-14 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="DogTrainerGH" className="mx-auto h-36 w-36 object-contain" />
            <h1 className="mt-2 font-display text-4xl sm:text-5xl text-espresso leading-tight">
              Managed dog training in Ghana
            </h1>
            <p className="mt-4 text-lg text-walnut max-w-xl mx-auto">
              Book a vetted trainer, get a program tailored to your dog, and pay securely on-platform —
              session by session.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href={registerUrl} className="rounded-full bg-espresso text-ivory text-sm font-semibold px-6 py-3 hover:bg-mahogany transition-colors">
                Get started →
              </a>
              <a href="/login?next=/trainers" className="rounded-full border border-hairline text-walnut text-sm font-semibold px-6 py-3 hover:border-gold transition-colors">
                I have a DogCareGH account
              </a>
            </div>
            <p className="mt-4 text-xs text-muted">Vetted trainers · Secure payments · Progress you can track</p>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-4xl px-6 py-10">
          <h2 className="text-center font-display text-2xl text-espresso">How it works</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Step n={1} title="Book an evaluation" body="A vetted trainer meets your dog and assesses what they need." />
            <Step n={2} title="Get a tailored plan" body="They send a recommended program with clear, per-session pricing." />
            <Step n={3} title="Train & track" body="Pay securely, then follow every session's progress in your dashboard." />
          </div>
        </section>

        {/* Featured trainers */}
        {featured.length > 0 && (
          <section className="mx-auto max-w-4xl px-6 py-10">
            <h2 className="text-center font-display text-2xl text-espresso">Meet some of our trainers</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {featured.map((t) => (
                <a key={t.id} href={`/login?next=/trainers/${t.id}`} className="rounded-2xl border border-hairline bg-white p-5 hover:border-gold transition-colors">
                  <div className="flex items-center gap-3">
                    {t.avatar_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.avatar_url} alt={t.name} className="h-11 w-11 shrink-0 rounded-full object-cover border border-hairline" />
                    )}
                    <div>
                      <p className="font-semibold text-espresso">{t.name}</p>
                      {t.review_count > 0 && (
                        <p className="text-xs text-walnut">★ {t.rating_avg.toFixed(1)} <span className="text-muted">({t.review_count})</span></p>
                      )}
                    </div>
                  </div>
                  {t.specialties.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {t.specialties.slice(0, 3).map((s) => (
                        <span key={s} className="text-xs text-walnut bg-ivory border border-hairline rounded-full px-2 py-0.5">{s}</span>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-xs text-muted">
                    {t.neighbourhoods.slice(0, 2).join(", ")}
                    {t.fromPrice != null ? ` · from ${cedis(t.fromPrice)}/session` : ""}
                  </p>
                </a>
              ))}
            </div>
            <p className="mt-6 text-center">
              <a href="/login?next=/trainers" className="text-sm text-gold font-semibold hover:underline">Browse all trainers →</a>
            </p>
          </section>
        )}

        {/* Trainer CTA */}
        <section className="mx-auto max-w-3xl px-6 pb-20">
          <div className="rounded-2xl border border-hairline bg-white p-6 text-center">
            <p className="text-sm text-walnut">
              Are you a dog trainer?{" "}
              <a href="/login" className="text-gold font-semibold hover:underline">Log in</a>{" "}
              or{" "}
              <Link href="/signup" className="text-gold font-semibold hover:underline">create a trainer account</Link>.
            </p>
          </div>
        </section>
      </main>
    );
  }

  // Signed in — greet and point to the single next best action.
  const trainerOrigin = user.user_metadata?.role === "trainer";
  const [admin, dogs, profile] = await Promise.all([
    isAdmin(),
    trainerOrigin ? Promise.resolve([]) : getMyDogs(),
    trainerOrigin ? Promise.resolve(null) : getMyOwnerProfile(),
  ]);
  const firstName = ((user.user_metadata?.name as string) || user.email || "").split(" ")[0];
  const hasProfile = !!profile && !!(profile.goal || profile.neighbourhood || profile.budget != null);

  const next = trainerOrigin
    ? { href: "/trainer", label: "Go to my trainer dashboard", hint: "Manage your leads, programs, and bookings." }
    : dogs.length === 0
      ? { href: "/dogs?next=/onboarding", label: "Add your dog", hint: "First, add your dog — bookings are made per dog." }
      : !hasProfile
        ? { href: "/onboarding", label: "Answer a few questions", hint: "Tell us about your dog so we can rank the right trainers." }
        : { href: "/dashboard", label: "Go to my dashboard", hint: "Pick up where you left off." };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl bg-white border border-hairline shadow-sm p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-gold font-semibold">DogTrainerGH</p>
        <h1 className="mt-2 font-display text-3xl text-espresso">
          Welcome back{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-2 text-sm text-muted">{next.hint}</p>

        <a href={next.href} className="mt-6 inline-block rounded-full bg-espresso text-ivory text-sm font-semibold px-5 py-2.5 hover:bg-mahogany transition-colors">
          {next.label} →
        </a>

        <div className="mt-5 grid gap-2 text-sm">
          <a href="/trainers" className="text-gold font-semibold hover:underline">Find a dog trainer →</a>
          {trainerOrigin ? (
            <a href="/trainer" className="text-gold font-semibold hover:underline">My trainer dashboard →</a>
          ) : (
            <a href="/trainer" className="text-gold font-semibold hover:underline">Become a trainer →</a>
          )}
          {admin && <a href="/admin" className="text-gold font-semibold hover:underline">Admin dashboard →</a>}
        </div>

        <form action={signOutAction} className="mt-6">
          <button type="submit" className="text-sm text-gold font-semibold hover:underline">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-hairline bg-white p-5">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cream text-espresso font-display font-semibold">
        {n}
      </span>
      <h3 className="mt-3 text-espresso font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}
