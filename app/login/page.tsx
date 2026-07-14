"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

const CARE_APP = "https://dogcaregh.com";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Return where they intended; default to the trainer dashboard. Full
    // navigation so the server sees the fresh session cookie.
    const raw = new URLSearchParams(window.location.search).get("next");
    const next = raw && raw.startsWith("/") ? raw : "/trainer";
    window.location.assign(next);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl bg-white border border-hairline shadow-sm p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-gold font-semibold">DogTrainerGH</p>
        <h1 className="mt-2 text-3xl text-espresso">Welcome back</h1>
        <p className="mt-2 text-sm text-muted">
          Log in to your DogTrainerGH / DogCareGH account.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-walnut">Email</span>
            <input
              required
              type="email"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-hairline bg-ivory px-3 py-2 text-espresso outline-none focus:border-gold"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-walnut">Password</span>
            <input
              required
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-hairline bg-ivory px-3 py-2 text-espresso outline-none focus:border-gold"
            />
          </label>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-espresso text-ivory text-sm font-semibold px-5 py-2.5 hover:bg-mahogany transition-colors disabled:opacity-60"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link href="/signup" className="text-gold font-semibold hover:underline">
            New trainer? Sign up
          </Link>
          <a href={`${CARE_APP}/forgot-password`} className="text-muted hover:underline">
            Forgot password?
          </a>
        </div>
      </div>
    </main>
  );
}
