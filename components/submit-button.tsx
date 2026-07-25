"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button that disables itself and shows a pending label while its form's
 * server action is in flight — prevents double-submits (e.g. duplicate paid
 * bookings) and makes the action feel responsive. Must be rendered inside the
 * <form> it submits. Pass `disabled` for additional (non-pending) gating.
 */
export function SubmitButton({
  children,
  className,
  disabled,
  pendingText = "Working…",
  title,
  name,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  pendingText?: string;
  title?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={pending || disabled} className={className} title={title} aria-busy={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
