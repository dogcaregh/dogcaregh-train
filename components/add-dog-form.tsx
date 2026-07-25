"use client";

import { useFormState } from "react-dom";
import { addDog } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

const SIZES = ["small", "medium", "large", "xlarge"];
const TEMPERAMENTS = ["friendly", "selective", "nervous"];

export function AddDogForm({ next }: { next: string }) {
  const [state, action] = useFormState(addDog, null);
  const v = state?.values;

  return (
    <form action={action} className="mt-3 space-y-4">
      <input type="hidden" name="next" value={next} />
      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field name="name" label="Name" required defaultValue={v?.name ?? ""} />
        <Field name="breed" label="Breed" defaultValue={v?.breed ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field name="age" label="Age (months)" type="number" defaultValue={v?.age ?? ""} />
        <Select name="size" label="Size" options={SIZES} defaultValue={v?.size ?? ""} />
      </div>
      <Select name="temperament" label="Temperament" options={TEMPERAMENTS} defaultValue={v?.temperament ?? ""} />
      <label className="flex items-center gap-2 text-sm text-walnut">
        <input type="checkbox" name="vaccination_status" defaultChecked={Boolean(v?.vaccination_status)} className="accent-gold" />
        Up to date on vaccinations
      </label>
      <SubmitButton pendingText="Adding…" className="w-full rounded-full bg-walnut text-ivory text-sm font-semibold px-5 py-3 hover:bg-mahogany transition-colors disabled:opacity-60">
        Add dog
      </SubmitButton>
    </form>
  );
}

function Field({ name, label, defaultValue, type = "text", required }: { name: string; label: string; defaultValue?: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-walnut">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} required={required} min={type === "number" ? 0 : undefined}
        className="mt-1 w-full rounded-lg border border-hairline bg-white px-3 py-2 text-espresso outline-none focus:border-gold" />
    </label>
  );
}

function Select({ name, label, options, defaultValue }: { name: string; label: string; options: string[]; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-walnut">{label}</span>
      <select name={name} defaultValue={defaultValue}
        className="mt-1 w-full rounded-lg border border-hairline bg-white px-3 py-2 text-espresso outline-none focus:border-gold capitalize">
        <option value="">Select…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
