"use client";

import { useState } from "react";

/**
 * Responsive top nav shell. Brand + `right` (e.g. the notification bell) are
 * always visible; the `links` and `extra` (messages, sign out) show inline on
 * desktop and collapse into a hamburger panel on mobile — so the bar stops
 * crowding on small screens. Plain <a> anchors on purpose (auth-gated routes).
 */
export function NavBar({
  brand,
  links,
  right,
  extra,
}: {
  brand: React.ReactNode;
  links: { href: string; label: string }[];
  right?: React.ReactNode;
  extra?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-hairline bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-5xl px-5 h-14 flex items-center justify-between">
        {brand}
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-5 text-sm">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="text-walnut hover:text-espresso">{l.label}</a>
            ))}
            {extra}
          </nav>
          {right}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="md:hidden text-walnut hover:text-espresso text-xl leading-none"
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {open && (
        <nav className="md:hidden border-t border-hairline bg-white px-5 py-3 flex flex-col gap-3 text-sm">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-walnut hover:text-espresso">{l.label}</a>
          ))}
          {extra}
        </nav>
      )}
    </header>
  );
}
