// The owner's first-run funnel: add a dog → answer questions → find trainers.
// Server component; used on /dogs (step 1) and /onboarding (step 2).
const STEPS = ["Add your dog", "Tell us about them", "Find trainers"];

export function Stepper({ current }: { current: number }) {
  return (
    <ol className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "current" : "todo";
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                state === "done"
                  ? "bg-gold text-ivory"
                  : state === "current"
                    ? "bg-espresso text-ivory"
                    : "bg-cream text-muted border border-hairline"
              }`}
            >
              {state === "done" ? "✓" : n}
            </span>
            <span className={state === "current" ? "text-espresso font-semibold" : "text-muted"}>{label}</span>
            {n < STEPS.length && <span className="text-hairline">→</span>}
          </li>
        );
      })}
    </ol>
  );
}
