"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { sendMessage } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import type { Msg } from "@/lib/messages";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

/**
 * Live chat thread + composer. Seeds from server-rendered messages and
 * subscribes to new ones in this owner↔trainer thread (RLS-scoped), so replies
 * appear without a refresh. `redirectTo` is the current thread URL.
 */
export function MessageThread({
  messages: initial,
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
  const [messages, setMessages] = useState<Msg[]>(initial);
  const endRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`msgs:${ownerId}:${trainerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trainer_messages", filter: `owner_id=eq.${ownerId}` },
        (payload) => {
          const m = payload.new as Msg & { owner_id: string; trainer_id: string };
          if (m.trainer_id !== trainerId) return; // same owner, different trainer thread
          setMessages((cur) =>
            cur.some((x) => x.id === m.id)
              ? cur
              : [...cur, { id: m.id, sender_id: m.sender_id, content: m.content, read: m.read, created_at: m.created_at }]
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ownerId, trainerId]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const text = (e.target as HTMLTextAreaElement).value.trim();
      if (text) formRef.current?.requestSubmit();
    }
  }

  return (
    <div>
      <div className="grid gap-2 max-h-[60vh] overflow-y-auto pr-1">
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
        <div ref={endRef} />
      </div>

      <form ref={formRef} action={sendMessage} className="mt-4 flex items-end gap-2">
        <input type="hidden" name="owner_id" value={ownerId} />
        <input type="hidden" name="trainer_id" value={trainerId} />
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <textarea
          name="content"
          rows={2}
          required
          maxLength={4000}
          onKeyDown={onKeyDown}
          placeholder="Write a message…  (Enter to send, Shift+Enter for a new line)"
          className="flex-1 resize-none rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-espresso focus:border-gold focus:outline-none"
        />
        <SubmitButton pendingText="Sending…" className="rounded-full bg-mahogany text-ivory text-sm font-semibold px-5 py-2.5 hover:bg-espresso transition-colors disabled:opacity-60">
          Send
        </SubmitButton>
      </form>
    </div>
  );
}
