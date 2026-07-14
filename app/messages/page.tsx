import { OwnerNav } from "@/components/owner-nav";
import { ThreadList } from "@/components/thread-list";
import { listOwnerThreads } from "@/lib/messages";

export const dynamic = "force-dynamic";

export default async function OwnerMessages() {
  const threads = await listOwnerThreads();
  return (
    <>
      <OwnerNav />
      <main className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="text-3xl text-espresso">Messages</h1>
        <p className="mt-1 text-sm text-muted">Chat with your trainers about scheduling and your dog.</p>
        <ThreadList threads={threads} base="/messages" />
      </main>
    </>
  );
}
