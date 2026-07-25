"use client";

import { useState } from "react";
import { declineRecommendation } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

/** "Decline" that expands into an optional "what would you change?" note before
 *  confirming — a request-changes path, not just a silent dead-end. */
export function DeclineRecommendation({ id }: { id: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-muted hover:text-espresso hover:underline">
        Decline
      </button>
    );
  }

  return (
    <form action={declineRecommendation} className="mt-2 w-full">
      <input type="hidden" name="recommendation_id" value={id} />
      <textarea
        name="reason"
        rows={2}
        placeholder="Optional: what would you like changed? (the trainer will see this)"
        className="w-full rounded-lg border border-hairline bg-ivory px-3 py-2 text-sm text-espresso outline-none focus:border-gold"
      />
      <div className="mt-1 flex items-center gap-2">
        <SubmitButton
          pendingText="Declining…"
          className="rounded-full border border-hairline text-walnut text-xs font-semibold px-4 py-1.5 hover:border-gold transition-colors disabled:opacity-60"
        >
          Decline recommendation
        </SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted hover:underline">
          Cancel
        </button>
      </div>
    </form>
  );
}
