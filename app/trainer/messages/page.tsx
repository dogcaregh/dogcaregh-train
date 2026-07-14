import { TrainerNav } from "@/components/trainer-nav";
import { ThreadList } from "@/components/thread-list";
import { listTrainerThreads } from "@/lib/messages";

export const dynamic = "force-dynamic";

export default async function TrainerMessages() {
  const threads = await listTrainerThreads();
  return (
    <>
      <TrainerNav />
      <main className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="text-3xl text-espresso">Messages</h1>
        <p className="mt-1 text-sm text-muted">Chat with owners about their dogs and scheduling.</p>
        <ThreadList threads={threads} base="/trainer/messages" />
      </main>
    </>
  );
}
