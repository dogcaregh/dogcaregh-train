"use client";

import { useState } from "react";
import { REGIONS, neighbourhoodsFor } from "@/lib/locations";

/**
 * Cascading Region → Neighbourhood dropdowns. The selects carry name="region"
 * and name="location" so they submit directly in a server-action form; for
 * JS-driven forms (e.g. signup) pass `onChange` to lift the values up.
 */
export function LocationPicker({
  defaultRegion = "",
  defaultNeighbourhood = "",
  required,
  onChange,
}: {
  defaultRegion?: string;
  defaultNeighbourhood?: string;
  required?: boolean;
  onChange?: (region: string, neighbourhood: string) => void;
}) {
  const [region, setRegion] = useState(defaultRegion);
  const [hood, setHood] = useState(defaultNeighbourhood);
  // Alphabetical for easy scanning, with the "Other (…)" catch-all pinned last.
  const hoods = [...neighbourhoodsFor(region)].sort((a, b) => {
    const ao = a.name.startsWith("Other"), bo = b.name.startsWith("Other");
    if (ao !== bo) return ao ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  const set = (r: string, h: string) => {
    setRegion(r);
    setHood(h);
    onChange?.(r, h);
  };

  const cls = "mt-1 w-full rounded-lg border border-hairline bg-ivory px-3 py-2 text-espresso outline-none focus:border-gold disabled:opacity-60";

  return (
    <div className="grid grid-cols-2 gap-4">
      <label className="block">
        <span className="text-sm font-semibold text-walnut">Region</span>
        <select name="region" required={required} value={region} onChange={(e) => set(e.target.value, "")} className={cls}>
          <option value="">Select region…</option>
          {REGIONS.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-walnut">Neighbourhood</span>
        <select name="location" required={required} value={hood} disabled={!region} onChange={(e) => set(region, e.target.value)} className={cls}>
          <option value="">{region ? "Select neighbourhood…" : "Pick a region first"}</option>
          {hoods.map((h) => <option key={h.name} value={h.name}>{h.name}</option>)}
        </select>
      </label>
    </div>
  );
}
