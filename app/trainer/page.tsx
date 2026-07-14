import { TrainerNav } from "@/components/trainer-nav";
import { getServerUser } from "@/lib/owner-data";
import { getMyTrainerProfile, getMyPrograms, getMyLeads, getMyTrainerBookings, getMyEarnings } from "@/lib/trainer-data";
import { cedis } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

export default async function TrainerDashboard() {
  const [profile, user] = await Promise.all([getMyTrainerProfile(), getServerUser()]);
  const trainerOrigin = user?.user_metadata?.role === "trainer";

  if (!profile) {
    // Trainer status is only for accounts that signed up as a trainer.
    // dogcaregh owners/providers can't self-promote — they sign up separately.
    if (!trainerOrigin) {
      return (
        <>
          <TrainerNav />
          <main className="mx-auto max-w-xl px-5 py-16 text-center">
            <h1 className="text-3xl text-espresso">Trainer accounts are separate</h1>
            <p className="mt-2 text-muted">
              Your DogCareGH account is set up as a dog owner here. To offer training, create a dedicated trainer account.
            </p>
            <a href="/signup" className="mt-6 inline-block rounded-full bg-mahogany text-ivory text-sm font-semibold px-6 py-3 hover:bg-espresso transition-colors">
              Sign up as a trainer
            </a>
            <p className="mt-4 text-sm text-muted">
              Looking for training instead?{" "}
              <a href="/trainers" className="text-gold font-semibold hover:underline">Find a trainer →</a>
            </p>
          </main>
        </>
      );
    }
    return (
      <>
        <TrainerNav />
        <main className="mx-auto max-w-xl px-5 py-16 text-center">
          <h1 className="text-3xl text-espresso">Become a trainer</h1>
          <p className="mt-2 text-muted">
            Set up your profile to appear to owners, receive evaluation requests, and send program recommendations.
          </p>
          <a href="/trainer/profile" className="mt-6 inline-block rounded-full bg-mahogany text-ivory text-sm font-semibold px-6 py-3 hover:bg-espresso transition-colors">
            Set up my profile
          </a>
        </main>
      </>
    );
  }

  const [programs, leads, bookings, earnings] = await Promise.all([
    getMyPrograms(),
    getMyLeads(),
    getMyTrainerBookings(),
    getMyEarnings(),
  ]);
  const openLeads = leads.filter((l) => !l.hasRecommendation && l.status !== "cancelled").length;

  type S = { status: string; scheduled_at: string | null };
  const allSessions = bookings.flatMap((b) =>
    ((b.trainer_sessions ?? []) as S[]).map((s) => ({ ...s, ownerName: b.ownerName as string }))
  );
  const now = new Date();
  const upcoming = allSessions
    .filter((s) => s.status !== "completed" && s.scheduled_at && new Date(s.scheduled_at) >= now)
    .sort((a, z) => new Date(a.scheduled_at!).getTime() - new Date(z.scheduled_at!).getTime());
  const toMark = allSessions.filter((s) => s.status !== "completed" && s.scheduled_at && new Date(s.scheduled_at) < now).length;
  const verified = profile.vetting_status === "verified";

  return (
    <>
      <TrainerNav />
      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-espresso">Trainer dashboard</h1>
            <p className="mt-1 text-sm text-muted">
              Vetting: <span className="capitalize text-walnut font-semibold">{profile.vetting_status}</span>
              {" · "}Evaluation fee ₵{profile.eval_fee}
              {profile.review_count > 0 && (
                <span className="text-walnut"> · ★ {profile.rating_avg.toFixed(1)} ({profile.review_count})</span>
              )}
            </p>
          </div>
          <a href="/trainer/profile" className="text-sm text-gold font-semibold hover:underline">Edit profile</a>
        </div>

        {!verified && (
          <div className="mt-4 rounded-xl border border-gold/40 bg-[rgba(185,138,50,0.08)] p-4 text-sm text-walnut">
            Your profile is <strong className="capitalize">{profile.vetting_status}</strong> — you won&apos;t appear to owners until an admin approves it. Add photos and complete your profile to help.
          </div>
        )}

        {/* Needs attention */}
        {(openLeads > 0 || toMark > 0) && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {openLeads > 0 && (
              <a href="/trainer/leads" className="block rounded-2xl border border-gold/50 bg-[rgba(185,138,50,0.08)] p-4 hover:border-gold transition-colors">
                <p className="text-sm font-semibold text-espresso">✨ {openLeads} lead{openLeads > 1 ? "s" : ""} to respond to</p>
                <p className="mt-0.5 text-xs text-walnut">Evaluate and send a recommendation.</p>
              </a>
            )}
            {toMark > 0 && (
              <a href="/trainer/bookings" className="block rounded-2xl border border-gold/50 bg-[rgba(185,138,50,0.08)] p-4 hover:border-gold transition-colors">
                <p className="text-sm font-semibold text-espresso">✓ {toMark} session{toMark > 1 ? "s" : ""} to mark complete</p>
                <p className="mt-0.5 text-xs text-walnut">Mark delivered sessions to release payout.</p>
              </a>
            )}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <Stat label="Open leads" value={openLeads} href="/trainer/leads" cta="View leads" />
          <Stat label="Programs" value={programs.length} href="/trainer/programs" cta="Manage" />
          <Stat label="Clients" value={bookings.length} href="/trainer/bookings" cta="View" />
          <Stat label="Available" value={cedis(earnings.available)} href="/trainer/earnings" cta="Cash out" money />
        </div>

        {upcoming.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg text-espresso">Upcoming sessions</h2>
            <div className="mt-3 grid gap-2">
              {upcoming.slice(0, 6).map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-white border border-hairline px-4 py-3 text-sm">
                  <span className="text-walnut">🗓 {s.ownerName}</span>
                  <span className="text-espresso font-semibold">{fmt(s.scheduled_at!)}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}

function Stat({ label, value, href, cta, money }: { label: string; value: number | string; href: string; cta: string; money?: boolean }) {
  return (
    <a href={href} className="block rounded-2xl bg-white border border-hairline p-5 hover:border-gold transition-colors">
      <p className={`font-display text-espresso ${money ? "text-2xl" : "text-4xl"}`}>{value}</p>
      <p className="mt-1 text-sm text-walnut">{label}</p>
      <p className="mt-3 text-xs text-gold font-semibold">{cta} →</p>
    </a>
  );
}
