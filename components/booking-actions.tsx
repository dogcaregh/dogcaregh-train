"use client";

import { useState } from "react";
import { bookEvaluation, rebookProgram } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
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
  // Hidden dog_ids inputs for a form (one per selected dog, order preserved).
  const dogInputs = selected.map((id) => <input key={id} type="hidden" name="dog_ids" value={id} />);
  const discountApplies = count >= 2 && multiDogDiscount > 0;

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
            <form key={p.id} action={bookEvaluation}>
              <input type="hidden" name="trainer_id" value={trainerId} />
              <input type="hidden" name="program_id" value={p.id} />
              {dogInputs}
              <SubmitButton disabled={none} pendingText="Starting…" className="w-full text-left rounded-lg border border-hairline bg-white px-4 py-2.5 text-sm text-walnut hover:border-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Evaluate for <strong className="text-espresso">{p.name}</strong>
              </SubmitButton>
            </form>
          ))}
          <form action={bookEvaluation}>
            <input type="hidden" name="trainer_id" value={trainerId} />
            {dogInputs}
            <SubmitButton disabled={none} pendingText="Starting…" className="w-full text-left rounded-lg border border-dashed border-hairline bg-white px-4 py-2.5 text-sm text-muted hover:border-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Not sure yet — general evaluation
            </SubmitButton>
          </form>
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
                {p.description && <p className="mt-1 text-sm text-muted">{p.description}</p>}
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
                <form action={rebookProgram} className="mt-3">
                  <input type="hidden" name="program_id" value={p.id} />
                  {dogInputs}
                  <SubmitButton
                    disabled={!canRebook || none}
                    pendingText="Booking…"
                    title={canRebook ? undefined : "Complete a program with this trainer to rebook directly"}
                    className="rounded-full bg-walnut text-ivory text-xs font-semibold px-4 py-2 hover:bg-mahogany transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-walnut"
                  >
                    Rebook directly
                  </SubmitButton>
                </form>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
