"use client";

import { useState } from "react";
import { markAllNotificationsRead } from "@/app/actions";

type Item = { id: string; message: string; link: string | null; read: boolean; created_at: string };

function ago(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NotifDropdown({ items, unread }: { items: Item[]; unread: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative text-walnut hover:text-espresso"
        aria-label="Notifications"
      >
        <span className="text-base">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-2 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-gold text-ivory text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 mt-2 w-80 max-h-[26rem] overflow-auto rounded-xl border border-hairline bg-white shadow-xl z-30">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-hairline sticky top-0 bg-white">
              <span className="text-sm font-semibold text-espresso">Notifications</span>
              {unread > 0 && (
                <form action={markAllNotificationsRead}>
                  <button className="text-xs text-gold font-semibold hover:underline">Mark all read</button>
                </form>
              )}
            </div>

            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">No notifications yet.</p>
            ) : (
              items.map((n) => (
                <a
                  key={n.id}
                  href={n.link || "/"}
                  className={`block px-4 py-3 border-b border-hairline/60 hover:bg-cream transition-colors ${n.read ? "" : "bg-[rgba(185,138,50,0.06)]"}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />}
                    <div className={n.read ? "pl-3.5" : ""}>
                      <p className="text-sm text-espresso leading-snug">{n.message}</p>
                      <p className="text-xs text-muted mt-0.5">{ago(n.created_at)}</p>
                    </div>
                  </div>
                </a>
              ))
            )}

            <a href="/notifications" className="block px-4 py-2.5 text-center text-xs text-gold font-semibold hover:underline">
              View all →
            </a>
          </div>
        </>
      )}
    </div>
  );
}
