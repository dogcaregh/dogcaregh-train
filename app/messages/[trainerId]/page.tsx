import { OwnerNav } from "@/components/owner-nav";
import { MessageThread } from "@/components/message-thread";
import { getOwnerThread } from "@/lib/messages";

export const dynamic = "force-dynamic";

export default async function OwnerThread({ params }: { params: { trainerId: string } }) {
  const t = await getOwnerThread(params.trainerId);
  const here = `/messages/${params.trainerId}`;
  return (
    <>
      <OwnerNav />
      <main className="mx-auto max-w-2xl px-5 py-8">
        <a href="/messages" className="text-sm text-gold font-semibold hover:underline">← All messages</a>
        <div className="mt-3 flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream text-walnut font-semibold overflow-hidden">
            {t.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              t.name.charAt(0).toUpperCase()
            )}
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
