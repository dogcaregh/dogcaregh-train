"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const BUCKET = "trainer-photos";

export function TrainerPhotos({
  userId,
  avatarUrl,
  gallery,
}: {
  userId: string;
  avatarUrl: string | null;
  gallery: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File, prefix: string): Promise<string> {
    const supabase = createClient();
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${userId}/${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) throw upErr;
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async function save(patch: Record<string, unknown>) {
    const supabase = createClient();
    const { error: dbErr } = await supabase.from("trainer_profiles").update(patch).eq("user_id", userId);
    if (dbErr) throw dbErr;
    router.refresh();
  }

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError("");
    try {
      await save({ avatar_url: await upload(file, "avatar") });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onGallery(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 6);
    if (files.length === 0) return;
    setBusy(true); setError("");
    try {
      const urls: string[] = [];
      for (const f of files) urls.push(await upload(f, "gallery"));
      await save({ gallery_photos: [...gallery, ...urls] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto(url: string) {
    setBusy(true); setError("");
    try {
      await save({ gallery_photos: gallery.filter((u) => u !== url) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-hairline p-5">
      <h2 className="text-lg text-espresso">Photos</h2>
      <p className="mt-1 text-xs text-muted">A clear profile photo and a few gallery shots build trust and win more bookings.</p>

      <div className="mt-4 flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl || "https://placehold.co/80x80/F3EADB/8A7862?text=Dog"}
          alt="Profile"
          className="h-20 w-20 rounded-full object-cover border border-hairline"
        />
        <label className="text-sm text-gold font-semibold hover:underline cursor-pointer">
          {avatarUrl ? "Change profile photo" : "Add a profile photo"}
          <input type="file" accept="image/*" className="hidden" onChange={onAvatar} disabled={busy} />
        </label>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-walnut">Gallery</span>
          <label className="text-sm text-gold font-semibold hover:underline cursor-pointer">
            + Add photos
            <input type="file" accept="image/*" multiple className="hidden" onChange={onGallery} disabled={busy} />
          </label>
        </div>
        {gallery.length === 0 ? (
          <p className="mt-2 text-xs text-muted">No gallery photos yet.</p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {gallery.map((url) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Gallery" className="h-24 w-full rounded-lg object-cover border border-hairline" />
                <button
                  onClick={() => removePhoto(url)}
                  disabled={busy}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-espresso text-ivory text-xs leading-none hover:bg-mahogany"
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {busy && <p className="mt-3 text-xs text-muted">Uploading…</p>}
      {error && <p className="mt-3 text-xs text-red-700">{error}</p>}
    </div>
  );
}
