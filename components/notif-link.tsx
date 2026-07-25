"use client";

import { markNotificationRead } from "@/app/actions";

/** A notification link that marks itself read on click before navigating. */
export function NotifLink({
  id,
  href,
  read,
  className,
  children,
}: {
  id: string;
  href: string;
  read: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={() => {
        if (!read) void markNotificationRead(id);
      }}
    >
      {children}
    </a>
  );
}
