import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { signOutAction } from "@/app/actions";

// Always read the live session — never statically cache this page.
export const dynamic = "force-dynamic";

const CARE_APP = "https://dogcaregh.com";

export default async function Home() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl bg-white border border-hairline shadow-sm p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-gold font-semibold">
          DogTrainerGH
        </p>
        <h1 className="mt-2 text-3xl text-espresso">
          Managed dog training
        </h1>

        {user ? (
          <div className="mt-6">
            <div className="rounded-xl bg-cream border border-hairline p-4">
              <p className="text-sm text-walnut font-semibold">
                ✓ Shared DogCareGH session detected
              </p>
              <p className="mt-1 text-sm text-espresso break-all">
                Signed in as <strong>{user.email}</strong>
              </p>
              <p className="mt-1 text-xs text-muted break-all">id: {user.id}</p>
            </div>
            <p className="mt-4 text-sm text-muted">
              You arrived here already authenticated — no second login.
            </p>
            <a
              href="/trainers"
              className="mt-6 inline-block rounded-full bg-espresso text-ivory text-sm font-semibold px-5 py-2.5 hover:bg-mahogany transition-colors"
            >
              Find a dog trainer →
            </a>
            <form action={signOutAction} className="mt-4">
              <button
                type="submit"
                className="text-sm text-gold font-semibold hover:underline"
              >
                Sign out (clears the shared session on both apps)
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-6">
            <div className="rounded-xl bg-cream border border-hairline p-4">
              <p className="text-sm text-walnut font-semibold">
                No shared session found
              </p>
              <p className="mt-1 text-sm text-espresso">
                You&apos;re not signed in on <code>.dogcaregh.com</code> yet.
              </p>
            </div>
            <p className="mt-4 text-sm text-muted">
              Already a DogCareGH owner?{" "}
              <a
                href={CARE_APP}
                className="text-gold font-semibold hover:underline"
              >
                Log in at dogcaregh.com
              </a>{" "}
              then return here — you&apos;ll land signed in.
            </p>
            <Link
              href="/signup"
              className="mt-6 inline-block rounded-full bg-espresso text-ivory text-sm font-semibold px-5 py-2.5 hover:bg-mahogany transition-colors"
            >
              Sign up as a trainer
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
