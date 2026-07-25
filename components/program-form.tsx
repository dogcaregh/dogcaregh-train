"use client";

import { useState } from "react";
import { saveProgram } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { cedis, programTotal, totalSessions } from "@/lib/pricing";

type ProgramInput = {
  id: string;
  name: string;
  description: string | null;
  weeks: number;
  sessions_per_week: number;
  price: number | string;
  discount: number | string;
};

export function ProgramForm({ program }: { program?: ProgramInput }) {
  const [spw, setSpw] = useState(Number(program?.sessions_per_week ?? 2));
  const [weeks, setWeeks] = useState(Number(program?.weeks ?? 4));
  const [price, setPrice] = useState(Number(program?.price ?? 60));
  const [discount, setDiscount] = useState(Number(program?.discount ?? 0));

  const sessions = totalSessions(spw, weeks);
  const total = programTotal(price, spw, weeks, discount);

  return (
    <form action={saveProgram} className="mt-3 space-y-3">
      {program && <input type="hidden" name="program_id" value={program.id} />}
      <Text name="name" label="Name" defaultValue={program?.name ?? ""} placeholder="Foundation, Hyper, Booster…" required />
      <Area name="description" label="Description (shown to owners)" defaultValue={program?.description ?? ""} placeholder="What this program covers — e.g. loose-lead walking, recall, sit/stay, settling around distractions." />
      <div className="grid grid-cols-2 gap-3">
        <Num name="sessions_per_week" label="Sessions / week" value={spw} set={setSpw} min={1} max={7} />
        <Num name="weeks" label="Weeks" value={weeks} set={setWeeks} min={1} max={52} />
        <Num name="price" label="Price / session (₵)" value={price} set={setPrice} min={0} max={100000} />
        <Num name="discount" label="Discount (%)" value={discount} set={setDiscount} min={0} max={90} />
      </div>

      <div className="flex items-center justify-between rounded-lg bg-cream border border-hairline px-3 py-2 text-sm">
        <span className="text-walnut">{sessions} sessions{discount > 0 ? ` · ${discount}% off` : ""}</span>
        <span className="text-espresso font-semibold">{cedis(total)}</span>
      </div>

      <SubmitButton pendingText="Saving…" className="rounded-full bg-mahogany text-ivory text-sm font-semibold px-5 py-2 hover:bg-espresso transition-colors disabled:opacity-60">
        {program ? "Save changes" : "Add program"}
      </SubmitButton>
    </form>
  );
}

function Text({ name, label, defaultValue, placeholder, required }: { name: string; label: string; defaultValue?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-walnut">{label}</span>
      <input name={name} type="text" defaultValue={defaultValue} placeholder={placeholder} required={required}
        className="mt-1 w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-espresso outline-none focus:border-gold" />
    </label>
  );
}

function Area({ name, label, defaultValue, placeholder }: { name: string; label: string; defaultValue?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-walnut">{label}</span>
      <textarea name={name} defaultValue={defaultValue} placeholder={placeholder} rows={3}
        className="mt-1 w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-espresso outline-none focus:border-gold" />
    </label>
  );
}

function Num({ name, label, value, set, min, max }: { name: string; label: string; value: number; set: (n: number) => void; min: number; max: number }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-walnut">{label}</span>
      <input type="number" name={name} value={value} min={min} max={max} onChange={(e) => set(Number(e.target.value))}
        className="mt-1 w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-espresso outline-none focus:border-gold" />
    </label>
  );
}
