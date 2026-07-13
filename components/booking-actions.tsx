"use client";

import { useState } from "react";
import { bookEvaluation, rebookProgram } from "@/app/actions";
import { cedis, programTotal, totalSessions } from "@/lib/pricing";

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
}: {
  trainerId: string;
  trainerName: string;
  evalFee: number;
  programs: Program[];
  dogs: Dog[];
  defaultDogId: string | null;
  canRebook: boolean;
}) {
  const [dogId, setDogId] = useState(defaultDogId ?? dogs[0]?.id ?? "");

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

  return (
    <>
      {/* Which dog is this booking for? Defaults to the onboarding dog. */}
      <div className="mt-8 rounded-2xl bg-white border border-hairline p-4">
        <label className="block">
          <span className="text-sm font-semibold text-walnut">Booking for</span>
          <select
            value={dogId}
            onChange={(e) => setDogId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-hairline bg-ivory px-3 py-2 text-espresso outline-none focus:border-gold"
          >
            {dogs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}{d.breed ? ` · ${d.breed}` : ""}
              </option>
            ))}
          </select>
        </label>
        <a href={`/dogs?next=/trainers/${trainerId}`} className="mt-1 inline-block text-xs text-gold font-semibold hover:underline">
          + Add another dog
        </a>
      </div>

      {/* Evaluation-first: the primary path for a new program */}
      <section className="mt-4 rounded-2xl border border-gold/40 bg-[rgba(185,138,50,0.06)] p-5">
        <h2 className="text-xl text-espresso">Start with an evaluation</h2>
        <p className="mt-1 text-sm text-walnut">
          Every new program begins with a paid evaluation. After meeting your dog,{" "}
          {trainerName.replace(/^DEMO · /, "")} sends a recommended program you can accept.
        </p>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-muted">Evaluation fee</span>
          <span className="text-espresso font-semibold">{cedis(evalFee)}</span>
        </div>

        <div className="mt-4 grid gap-2">
          {programs.map((p) => (
            <form key={p.id} action={bookEvaluation}>
              <input type="hidden" name="trainer_id" value={trainerId} />
              <input type="hidden" name="program_id" value={p.id} />
              <input type="hidden" name="dog_id" value={dogId} />
              <button className="w-full text-left rounded-lg border border-hairline bg-white px-4 py-2.5 text-sm text-walnut hover:border-gold transition-colors">
                Evaluate for <strong className="text-espresso">{p.name}</strong>
              </button>
            </form>
          ))}
          <form action={bookEvaluation}>
            <input type="hidden" name="trainer_id" value={trainerId} />
            <input type="hidden" name="dog_id" value={dogId} />
            <button className="w-full text-left rounded-lg border border-dashed border-hairline bg-white px-4 py-2.5 text-sm text-muted hover:border-gold transition-colors">
              Not sure yet — general evaluation
            </button>
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
        <div className="mt-4 grid gap-3">
          {programs.map((p) => {
            const total = programTotal(p.price, p.sessions_per_week, p.weeks, p.discount);
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
                <form action={rebookProgram} className="mt-3">
                  <input type="hidden" name="program_id" value={p.id} />
                  <input type="hidden" name="dog_id" value={dogId} />
                  <button
                    disabled={!canRebook}
                    title={canRebook ? undefined : "Complete a program with this trainer to rebook directly"}
                    className="rounded-full bg-walnut text-ivory text-xs font-semibold px-4 py-2 hover:bg-mahogany transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-walnut"
                  >
                    Rebook directly
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
