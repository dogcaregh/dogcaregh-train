"use client";

import { useState } from "react";
import { updateDog } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

export type Dog = {
  id: string;
  name: string;
  breed: string | null;
  age: number | null;
  size: string | null;
  temperament: string | null;
  vaccination_status: boolean;
};

const SIZES = ["small", "medium", "large", "xlarge"];
const TEMPERAMENTS = ["friendly", "selective", "nervous"];

export function DogCard({ dog }: { dog: Dog }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="rounded-xl bg-white border border-hairline p-4">
        <div className="flex items-center justify-between">
          <p className="text-espresso font-semibold">{dog.name}</p>
          <div className="flex items-center gap-3">
            {dog.vaccination_status && <span className="text-xs text-gold font-semibold">✓ Vaccinated</span>}
            <button onClick={() => setEditing(true)} className="text-xs text-gold font-semibold hover:underline">
              Edit
            </button>
          </div>
        </div>
        <p className="text-xs text-muted mt-0.5">
          {[dog.breed, dog.size, dog.age != null ? `${dog.age} mo` : null, dog.temperament].filter(Boolean).join(" · ") || "—"}
        </p>
      </div>
    );
  }

  return (
    <form action={updateDog} className="rounded-xl bg-white border border-gold/40 p-4 space-y-3">
      <input type="hidden" name="dog_id" value={dog.id} />
      <div className="grid grid-cols-2 gap-3">
        <Field name="name" label="Name" defaultValue={dog.name} required />
        <Field name="breed" label="Breed" defaultValue={dog.breed ?? ""} />
        <Field name="age" label="Age (months)" type="number" defaultValue={dog.age?.toString() ?? ""} />
        <Select name="size" label="Size" options={SIZES} defaultValue={dog.size ?? ""} />
      </div>
      <Select name="temperament" label="Temperament" options={TEMPERAMENTS} defaultValue={dog.temperament ?? ""} />
      <label className="flex items-center gap-2 text-sm text-walnut">
        <input type="checkbox" name="vaccination_status" defaultChecked={dog.vaccination_status} className="accent-gold" />
        Up to date on vaccinations
      </label>
      <div className="flex gap-2">
        <SubmitButton pendingText="Saving…" className="rounded-full bg-walnut text-ivory text-xs font-semibold px-4 py-2 hover:bg-mahogany transition-colors disabled:opacity-60">
          Save changes
        </SubmitButton>
        <button type="button" onClick={() => setEditing(false)} className="rounded-full border border-hairline text-walnut text-xs font-semibold px-4 py-2 hover:border-gold transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ name, label, defaultValue, type = "text", required }: { name: string; label: string; defaultValue?: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-walnut">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} required={required} min={type === "number" ? 0 : undefined}
        className="mt-1 w-full rounded-lg border border-hairline bg-ivory px-3 py-2 text-sm text-espresso outline-none focus:border-gold" />
    </label>
  );
}

function Select({ name, label, options, defaultValue }: { name: string; label: string; options: string[]; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-walnut">{label}</span>
      <select name={name} defaultValue={defaultValue}
        className="mt-1 w-full rounded-lg border border-hairline bg-ivory px-3 py-2 text-sm text-espresso outline-none focus:border-gold capitalize">
        <option value="">Select…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
