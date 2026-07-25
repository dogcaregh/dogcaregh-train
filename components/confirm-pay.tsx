"use client";

import { useEffect, useState } from "react";
import { SubmitButton } from "@/components/submit-button";

/**
 * A trigger button that opens a confirmation modal summarising a paid action
 * (dogs, program, total) before it runs. The actual server action only fires
 * from the modal's "Confirm & pay" — so nothing is charged on a stray click,
 * and the SubmitButton inside blocks double-submits.
 *
 * The server action is passed straight through as a prop; `fields` become hidden
 * inputs (array values → repeated inputs, e.g. multiple dog_ids).
 */
export function ConfirmPay({
  triggerLabel,
  triggerClassName,
  triggerTitle,
  disabled,
  title,
  summary,
  confirmLabel,
  pendingText,
  action,
  fields,
}: {
  triggerLabel: React.ReactNode;
  triggerClassName?: string;
  triggerTitle?: string;
  disabled?: boolean;
  title: string;
  summary: React.ReactNode;
  confirmLabel: string;
  pendingText?: string;
  action: (formData: FormData) => void | Promise<void>;
  fields: Record<string, string | string[]>;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" disabled={disabled} title={triggerTitle} onClick={() => setOpen(true)} className={triggerClassName}>
        {triggerLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-espresso/40 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white border border-hairline shadow-xl p-5">
            <h3 className="font-display text-lg text-espresso">{title}</h3>
            <div className="mt-3 text-sm text-walnut">{summary}</div>
            <form action={action} className="mt-5 flex items-center gap-2">
              {Object.entries(fields).flatMap(([name, val]) =>
                Array.isArray(val)
                  ? val.map((v, i) => <input key={`${name}-${i}`} type="hidden" name={name} value={v} />)
                  : [<input key={name} type="hidden" name={name} value={val} />]
              )}
              <SubmitButton
                pendingText={pendingText}
                className="flex-1 rounded-full bg-walnut text-ivory text-sm font-semibold px-5 py-2.5 hover:bg-mahogany transition-colors disabled:opacity-60"
              >
                {confirmLabel}
              </SubmitButton>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-hairline text-walnut text-sm font-semibold px-4 py-2.5 hover:border-gold transition-colors"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
