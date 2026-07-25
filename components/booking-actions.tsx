"use client";

import { useState } from "react";
import { bookEvaluation, rebookProgram } from "@/app/actions";
import { ConfirmPay } from "@/components/confirm-pay";
import { cedis, programTotal, totalSessions, multiDogTotal } from "@/lib/pricing";

type Program = {
  id: string;
  name: string;
  description: string | null;
  weeks: number;
  sessions_per_week: number;
  price: number;
  discount: number;
};
type Dog = { id: string; name: string; breed: string | null };

export function BookingActions({
  trainerId,
  trainerName,
  evalFee,
  programs,
  dogs,
  defaultDogId,
  canRebook,
  multiDogDiscount,
}: {
  trainerId: string;
  trainerName: string;
  evalFee: number;
  programs: Program[];
  dogs: Dog[];
  defaultDogId: string | null;
  canRebook: boolean;
  multiDogDiscount: number;
}) {
  const initial = defaultDogId ?? dogs[0]?.id ?? "";
  const [selected, setSelected] = useState<string[]>(initial ? [initial] : []);

  if (dogs.length === 0) {
    return (
      <section className="mt-8 rounded-2xl border border-gold/40 bg-[rgba(185,138,50,0.06)] p-5">
        <p className="text-sm text-walnut">
          Bookings are made per dog.{" "}
          <a href={`/dogs?next=/trainers/${trainerId}`} className="font-semibold text-espresso underline">
            Add your dog
          </a>{" "}
          to book with {trainerName.replace(/^DEMO · /, "")}.
        </p>
      </section>
    );
  }

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const count = selected.length;
  const none = count === 0;
  const discountApplies = count >= 2 && multiDogDiscount > 0;
  const selectedDogs = dogs.filter((d) => selected.includes(d.id));
  const dogNames = selectedDogs.map((d) => d.name).join(", ");
  const cleanName = trainerName.replace(/^DEMO · /, "");

  const evalSummary = (progName?: string) => (
    <ul className="space-y-1.5">
      <SumRow label="Trainer" value={cleanName} />
      <SumRow label={count > 1 ? "Dogs" : "Dog"} value={dogNames} />
      {progName && <SumRow label="Interested in" value={progName} />}
      <li className="flex items-center justify-between border-t border-hairline pt-1.5 mt-1.5">
        <span className="font-semibold text-espresso">Evaluation fee</span>
        <span className="font-semibold text-espresso">{cedis(evalFee)}</span>
      </li>
      {count > 1 && <li className="text-xs text-muted">One fee covers all {count} dogs.</li>}
    </ul>
  );

  const contactField = (
    <label className="block">
      <span className="text-xs font-semibold text-walnut">Your contact number</span>
      <input
        name="contact_phone"
        type="tel"
        required
        placeholder="e.g. 024 123 4567"
        className="mt-1 w-full rounded-lg border border-hairline bg-ivory px-3 py-2 text-sm text-espresso outline-none focus:border-gold"
      />
      <span className="mt-1 block text-[11px] text-muted">The trainer will call this to confirm your location.</span>
    </label>
  );

  return (
    <>
      {/* Which dogs is this booking for? Defaults to your onboarding dog. */}
      <div className="mt-8 rounded-2xl bg-white border border-hairline p-4">
        <p className="text-sm font-semibold text-walnut">Which dog{dogs.length > 1 ? "s" : ""}?</p>
        <div className="mt-2 grid gap-1.5">
          {dogs.map((d) => (
            <label key={d.id} className="flex items-center gap-2 rounded-lg border border-hairline bg-ivory px-3 py-2 cursor-pointer hover:border-gold">
              <input
                type="checkbox"
                checked={selected.includes(d.id)}
                onChange={() => toggle(d.id)}
                className="accent-gold"
              />
              <span className="text-sm text-espresso">
                {d.name}{d.breed ? <span className="text-muted"> · {d.breed}</span> : null}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <a href={`/dogs?next=/trainers/${trainerId}`} className="text-xs text-gold font-semibold hover:underline">
            + Add another dog
          </a>
          {none && <span className="text-xs text-red-600">Select at least one dog</span>}
        </div>
      </div>

      {/* Evaluation-first: the primary path for a new program */}
      <section className="mt-4 rounded-2xl border border-gold/40 bg-[rgba(185,138,50,0.06)] p-5">
        <h2 className="text-xl text-espresso">Start with an evaluation</h2>
        <p className="mt-1 text-sm text-walnut">
          Every new program begins with a paid evaluation. After meeting your dog
          {count > 1 ? "s" : ""}, {trainerName.replace(/^DEMO · /, "")} sends a recommended program you can accept.
        </p>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-muted">Evaluation fee{count > 1 ? " (covers all selected dogs)" : ""}</span>
          <span className="text-espresso font-semibold">{cedis(evalFee)}</span>
        </div>

        <div className="mt-4 grid gap-2">
          {programs.map((p) => (
            <ConfirmPay
              key={p.id}
              triggerLabel={<>Evaluate for <strong className="text-espresso">{p.name}</strong></>}
              triggerClassName="w-full text-left rounded-lg border border-hairline bg-white px-4 py-2.5 text-sm text-walnut hover:border-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={none}
              title="Book an evaluation"
              summary={evalSummary(p.name)}
              confirmLabel="Confirm & pay"
              pendingText="Starting…"
              action={bookEvaluation}
              fields={{ trainer_id: trainerId, program_id: p.id, dog_ids: selected }}
              extra={contactField}
            />
          ))}
          <ConfirmPay
            triggerLabel="Not sure yet — general evaluation"
            triggerClassName="w-full text-left rounded-lg border border-dashed border-hairline bg-white px-4 py-2.5 text-sm text-muted hover:border-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={none}
            title="Book an evaluation"
            summary={evalSummary()}
            confirmLabel="Confirm & pay"
            pendingText="Starting…"
            action={bookEvaluation}
            fields={{ trainer_id: trainerId, dog_ids: selected }}
            extra={contactField}
          />
        </div>
      </section>

      {/* Programs + direct rebooking (returning owners) */}
      <section className="mt-8">
        <h2 className="text-xl text-espresso">Programs &amp; pricing</h2>
        <p className="mt-1 text-xs text-muted">
          {canRebook
            ? "You've trained with this trainer — rebook any program directly."
            : "Direct rebooking unlocks after you complete a program with this trainer. New programs start with an evaluation."}
        </p>
        {discountApplies && (
          <p className="mt-1 text-xs text-gold font-semibold">
            {multiDogDiscount}% multi-dog discount applied for {count} dogs.
          </p>
        )}
        <div className="mt-4 grid gap-3">
          {programs.map((p) => {
            const perDog = programTotal(p.price, p.sessions_per_week, p.weeks, p.discount);
            const total = multiDogTotal(perDog, Math.max(count, 1), multiDogDiscount);
            return (
              <div key={p.id} className="rounded-2xl bg-white border border-hairline p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg text-espresso">{p.name}</h3>
                  <span className="text-espresso font-semibold">{cedis(total)}</span>
                </div>
                {p.description && <p className="mt-1 text-sm text-muted whitespace-pre-line">{p.description}</p>}
                <div className="mt-2 text-xs text-muted">
                  {p.sessions_per_week}×/week · {p.weeks} weeks · {totalSessions(p.sessions_per_week, p.weeks)} sessions
                  {p.discount > 0 && <span className="text-gold font-semibold"> · {p.discount}% off</span>}
                  {" · "}{cedis(p.price)}/session
                </div>
                {count > 1 && (
                  <div className="mt-1 text-xs text-walnut">
                    {cedis(perDog)} × {count} dogs{discountApplies ? ` · −${multiDogDiscount}%` : ""} = <strong className="text-espresso">{cedis(total)}</strong>
                  </div>
                )}
                <div className="mt-3">
                  <ConfirmPay
                    triggerLabel="Rebook directly"
                    triggerClassName="rounded-full bg-walnut text-ivory text-xs font-semibold px-4 py-2 hover:bg-mahogany transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-walnut"
                    triggerTitle={canRebook ? undefined : "Complete a program with this trainer to rebook directly"}
                    disabled={!canRebook || none}
                    title={`Book ${p.name}`}
                    summary={
                      <ul className="space-y-1.5">
                        <SumRow label="Trainer" value={cleanName} />
                        <SumRow label="Program" value={p.name} />
                        <SumRow label={count > 1 ? "Dogs" : "Dog"} value={dogNames} />
                        <SumRow label="Sessions" value={`${totalSessions(p.sessions_per_week, p.weeks)} (${p.sessions_per_week}×/week · ${p.weeks} wks)`} />
                        {count > 1 && (
                          <SumRow label={`${cedis(perDog)} × ${count} dogs${discountApplies ? ` · −${multiDogDiscount}%` : ""}`} value="" />
                        )}
                        <li className="flex items-center justify-between border-t border-hairline pt-1.5 mt-1.5">
                          <span className="font-semibold text-espresso">Total</span>
                          <span className="font-semibold text-espresso">{cedis(total)}</span>
                        </li>
                      </ul>
                    }
                    confirmLabel="Confirm & pay"
                    pendingText="Booking…"
                    action={rebookProgram}
                    fields={{ program_id: p.id, dog_ids: selected }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-4">
      <span className="text-muted">{label}</span>
      {value && <span className="text-espresso text-right">{value}</span>}
    </li>
  );
}
