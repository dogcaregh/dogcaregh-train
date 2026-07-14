import type { ThreadSummary } from "@/lib/messages";

const ago = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** Inbox: one row per conversation. `base` is "/messages" or "/trainer/messages". */
export function ThreadList({ threads, base }: { threads: ThreadSummary[]; base: string }) {
  if (threads.length === 0) {
    return <p className="mt-6 text-sm text-muted">No conversations yet.</p>;
  }
  return (
    <div className="mt-6 grid gap-2">
      {threads.map((t) => (
        <a
          key={t.partnerId}
          href={`${base}/${t.partnerId}`}
          className="flex items-center gap-3 rounded-xl bg-white border border-hairline px-4 py-3 hover:border-gold transition-colors"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream text-sm font-semibold text-walnut overflow-hidden">
            {t.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              t.name.charAt(0).toUpperCase()
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between">
              <span className="text-sm font-semibold text-espresso truncate">{t.name}</span>
              <span className="text-[11px] text-muted shrink-0 ml-2">{ago(t.lastAt)}</span>
            </span>
            <span className="text-xs text-muted truncate block">{t.last}</span>
          </span>
          {t.unread > 0 && (
            <span className="ml-1 min-w-5 h-5 px-1.5 rounded-full bg-mahogany text-ivory text-[11px] font-bold grid place-items-center shrink-0">
              {t.unread}
            </span>
          )}
        </a>
      ))}
    </div>
  );
}
