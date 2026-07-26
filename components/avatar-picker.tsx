"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

const BUCKET = "trainer-photos";

/**
 * Mandatory profile photo for the trainer profile form. Uploads to storage on
 * select (the trainer is authenticated here) and holds the resulting URL in a
 * hidden `avatar_url` input that saveTrainerProfile persists. saveTrainerProfile
 * enforces that a URL is present.
 */
export function AvatarPicker({ userId, defaultUrl }: { userId: string; defaultUrl: string | null }) {
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${userId}/avatar-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      setUrl(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="text-sm font-semibold text-walnut">Profile photo <span className="text-red-600">*</span></span>
      <input type="hidden" name="avatar_url" value={url} />
      <div className="mt-1 flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url || "https://placehold.co/72x72/F3EADB/8A7862?text=Dog"}
          alt="Profile"
          className="h-[72px] w-[72px] rounded-full object-cover border border-hairline"
        />
        <label className="text-sm text-gold font-semibold hover:underline cursor-pointer">
          {url ? "Change photo" : "Upload photo"}
          <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={busy} />
        </label>
      </div>
      {busy && <p className="mt-1 text-xs text-muted">Uploading…</p>}
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
      {!url && !busy && <p className="mt-1 text-xs text-muted">Required — owners see this on your profile.</p>}
    </div>
  );
}
