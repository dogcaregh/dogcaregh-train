"use client";

import { useState } from "react";
import { sendRecommendation } from "@/app/actions";
import { programTotal, totalSessions, cedis } from "@/lib/pricing";

// The custom plan builder from the prototype: sessions/week × weeks × price
// + discount, with a live "Recommended for you" total as the trainer types.
export function RecommendationBuilder({ evaluationId }: { evaluationId: string }) {
  const [spw, setSpw] = useState(2);
  const [weeks, setWeeks] = useState(6);
  const [price, setPrice] = useState(70);
  const [discount, setDiscount] = useState(0);

  const total = programTotal(price, spw, weeks, discount);

  return (
    <form action={sendRecommendation} className="mt-3 rounded-xl border border-hairline bg-white p-4 space-y-3">
      <input type="hidden" name="mode" value="custom" />
      <input type="hidden" name="evaluation_id" value={evaluationId} />

      <label className="block">
        <span className="text-xs font-semibold text-walnut">Plan name</span>
        <input name="name" defaultValue="Custom plan" required
          className="mt-1 w-full rounded-lg border border-hairline bg-ivory px-3 py-2 text-sm text-espresso outline-none focus:border-gold" />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <Num label="Sessions / week" name="sessions_per_week" value={spw} setValue={setSpw} min={1} max={7} />
        <Num label="Weeks" name="weeks" value={weeks} setValue={setWeeks} min={1} max={52} />
        <Num label="Price / session (₵)" name="price" value={price} setValue={setPrice} min={0} max={1000} />
        <Num label="Discount (%)" name="discount" value={discount} setValue={setDiscount} min={0} max={90} />
      </div>

      <label className="block">
        <span className="text-xs font-semibold text-walnut">Note to owner (optional)</span>
        <input name="note" placeholder="Why this plan fits their dog"
          className="mt-1 w-full rounded-lg border border-hairline bg-ivory px-3 py-2 text-sm text-espresso outline-none focus:border-gold" />
      </label>

      <div className="flex items-center justify-between rounded-lg bg-cream border border-hairline px-3 py-2">
        <span className="text-xs text-walnut">
          {totalSessions(spw, weeks)} sessions{discount > 0 ? ` · ${discount}% off` : ""}
        </span>
        <span className="text-espresso font-semibold">{cedis(total)}</span>
      </div>

      <button className="w-full rounded-full bg-mahogany text-ivory text-sm font-semibold px-5 py-2.5 hover:bg-espresso transition-colors">
        Send custom plan to owner
      </button>
    </form>
  );
}

function Num({ label, name, value, setValue, min, max }: { label: string; name: string; value: number; setValue: (n: number) => void; min: number; max: number }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-walnut">{label}</span>
      <input type="number" name={name} value={value} min={min} max={max}
        onChange={(e) => setValue(Number(e.target.value))}
        className="mt-1 w-full rounded-lg border border-hairline bg-ivory px-3 py-2 text-sm text-espresso outline-none focus:border-gold" />
    </label>
  );
}
