"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { LocationPicker } from "@/components/location-picker";

export default function TrainerSignup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [neighbourhood, setNeighbourhood] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle"
  );
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !phone.trim() || !region || !neighbourhood) {
      setError("Please fill in your name, phone number, and location (region + neighbourhood).");
      setStatus("error");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setStatus("error");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // role is stamped in metadata now; the users.is_trainer flag is set
        // when the trainer profile is created (Phase 3, sub-step 3).
        data: { name, role: "trainer", phone: phone.trim(), region, location: neighbourhood },
        // Land freshly-confirmed trainers on their dashboard (which prompts
        // profile setup for a new account) rather than the public landing page.
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/trainer`,
      },
    });

    if (error) {
      setError(error.message);
      setStatus("error");
      return;
    }

    // Auth is shared with the care app, so this email may already have a
    // DogCareGH account. In that case Supabase sends NO confirmation email and
    // returns an obfuscated user with an empty identities array — don't promise
    // a link that will never arrive; point them at login instead.
    if (data.user && data.user.identities?.length === 0) {
      setError(
        "You already have a DogCareGH account with this email. Log in and set up a trainer profile instead — no need to sign up again."
      );
      setStatus("error");
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl bg-white border border-hairline shadow-sm p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-gold font-semibold">
          DogTrainerGH
        </p>
        <h1 className="mt-2 text-3xl text-espresso">Become a trainer</h1>

        {status === "sent" ? (
          <div className="mt-6 rounded-xl bg-cream border border-hairline p-4">
            <p className="text-sm text-walnut font-semibold">
              Check your email
            </p>
            <p className="mt-1 text-sm text-espresso">
              We sent a confirmation link to <strong>{email}</strong>. Click it
              to finish creating your trainer account.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field
              label="Full name"
              value={name}
              onChange={setName}
              type="text"
              autoComplete="name"
            />
            <Field
              label="Email"
              value={email}
              onChange={setEmail}
              type="email"
              autoComplete="email"
            />
            <Field
              label="Phone number"
              value={phone}
              onChange={setPhone}
              type="tel"
              autoComplete="tel"
            />
            <LocationPicker
              onChange={(r, h) => {
                setRegion(r);
                setNeighbourhood(h);
              }}
            />
            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
            />
            <Field
              label="Confirm password"
              value={confirm}
              onChange={setConfirm}
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
            />
            <label className="flex items-center gap-2 text-sm text-walnut">
              <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} className="accent-gold" />
              Show password
            </label>

            {error && <p className="text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-full bg-espresso text-ivory text-sm font-semibold px-5 py-2.5 hover:bg-mahogany transition-colors disabled:opacity-60"
            >
              {status === "loading" ? "Creating…" : "Create trainer account"}
            </button>
          </form>
        )}

        <p className="mt-6 text-sm text-muted">
          Already have a DogCareGH account?{" "}
          <a href="/login" className="text-gold font-semibold hover:underline">Log in</a>{" "}
          and set up a trainer profile — no need to sign up again.
        </p>
        <p className="mt-3 text-sm text-muted">
          <Link href="/" className="text-gold font-semibold hover:underline">
            ← Back
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  autoComplete: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-walnut">{label}</span>
      <input
        required
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-hairline bg-ivory px-3 py-2 text-espresso outline-none focus:border-gold"
      />
    </label>
  );
}
