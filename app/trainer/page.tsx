import { TrainerNav } from "@/components/trainer-nav";
import { getServerUser } from "@/lib/owner-data";
import { getMyTrainerProfile, getMyPrograms, getMyLeads, getMyTrainerBookings } from "@/lib/trainer-data";

export const dynamic = "force-dynamic";

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

  const [programs, leads, bookings] = await Promise.all([
    getMyPrograms(),
    getMyLeads(),
    getMyTrainerBookings(),
  ]);
  const openLeads = leads.filter((l) => !l.hasRecommendation && l.status !== "cancelled").length;

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

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat label="Open leads" value={openLeads} href="/trainer/leads" cta="View leads" />
          <Stat label="Programs" value={programs.length} href="/trainer/programs" cta="Manage programs" />
          <Stat label="Clients" value={bookings.length} href="/trainer/bookings" cta="View clients" />
        </div>
      </main>
    </>
  );
}

function Stat({ label, value, href, cta }: { label: string; value: number; href: string; cta: string }) {
  return (
    <a href={href} className="block rounded-2xl bg-white border border-hairline p-5 hover:border-gold transition-colors">
      <p className="text-4xl font-display text-espresso">{value}</p>
      <p className="mt-1 text-sm text-walnut">{label}</p>
      <p className="mt-3 text-xs text-gold font-semibold">{cta} →</p>
    </a>
  );
}
