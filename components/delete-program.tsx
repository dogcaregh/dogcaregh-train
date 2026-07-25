"use client";

import { useState } from "react";
import { deleteProgram } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

/** Delete a program behind an inline confirm step. */
export function DeleteProgram({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);

  if (!confirm) {
    return (
      <button onClick={() => setConfirm(true)} className="text-xs text-red-700 hover:underline">
        Delete
      </button>
    );
  }

  return (
    <form action={deleteProgram} className="flex items-center gap-2">
      <input type="hidden" name="program_id" value={id} />
      <span className="text-xs text-walnut">Delete this program?</span>
      <SubmitButton pendingText="Deleting…" className="text-xs text-red-700 font-semibold hover:underline disabled:opacity-60">
        Yes, delete
      </SubmitButton>
      <button type="button" onClick={() => setConfirm(false)} className="text-xs text-muted hover:underline">
        Cancel
      </button>
    </form>
  );
}
