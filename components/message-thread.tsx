import { sendMessage } from "@/app/actions";
import type { Msg } from "@/lib/messages";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

/** Read-only thread view + composer. `redirectTo` is the current thread URL. */
export function MessageThread({
  messages,
  meId,
  ownerId,
  trainerId,
  redirectTo,
}: {
  messages: Msg[];
  meId: string;
  ownerId: string;
  trainerId: string;
  redirectTo: string;
}) {
  return (
    <div>
      <div className="grid gap-2">
        {messages.length === 0 && (
          <p className="text-sm text-muted py-8 text-center">No messages yet — say hello 👋</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === meId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  mine ? "bg-espresso text-ivory rounded-br-sm" : "bg-white border border-hairline text-espresso rounded-bl-sm"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p className={`mt-1 text-[10px] ${mine ? "text-ivory/60" : "text-muted"}`}>{fmt(m.created_at)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <form action={sendMessage} className="mt-4 flex items-end gap-2">
        <input type="hidden" name="owner_id" value={ownerId} />
        <input type="hidden" name="trainer_id" value={trainerId} />
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <textarea
          name="content"
          rows={2}
          required
          maxLength={4000}
          placeholder="Write a message…"
          className="flex-1 resize-none rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-espresso focus:border-gold focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-mahogany text-ivory text-sm font-semibold px-5 py-2.5 hover:bg-espresso transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
