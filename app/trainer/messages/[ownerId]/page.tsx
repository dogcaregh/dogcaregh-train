import { notFound } from "next/navigation";
import { TrainerNav } from "@/components/trainer-nav";
import { MessageThread } from "@/components/message-thread";
import { getTrainerThread } from "@/lib/messages";

export const dynamic = "force-dynamic";

export default async function TrainerThread({ params }: { params: { ownerId: string } }) {
  const t = await getTrainerThread(params.ownerId);
  if (!t) notFound();
  const here = `/trainer/messages/${params.ownerId}`;
  return (
    <>
      <TrainerNav />
      <main className="mx-auto max-w-2xl px-5 py-8">
        <a href="/trainer/messages" className="text-sm text-gold font-semibold hover:underline">← All messages</a>
        <div className="mt-3 flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream text-walnut font-semibold">
            {t.name.charAt(0).toUpperCase()}
          </span>
          <h1 className="text-2xl text-espresso">{t.name}</h1>
        </div>
        <div className="mt-5">
          <MessageThread messages={t.messages} meId={t.meId} ownerId={t.ownerId} trainerId={t.trainerId} redirectTo={here} />
        </div>
      </main>
    </>
  );
}
