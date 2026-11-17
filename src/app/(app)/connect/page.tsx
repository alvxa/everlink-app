import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/misc";
import { RandomConnect } from "@/components/connect/random-connect";

export const metadata: Metadata = { title: "Random Connect" };
export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  const me = await getCurrentUser();
  if (!me) return null;

  return (
    <div className="space-y-4 px-4 pb-6 pt-5 sm:px-6">
      <PageHeader
        title="Random Connect"
        description="A surprise conversation with someone outside your usual circle."
      />
      <RandomConnect
        enabled={me.settings?.allowRandomConnect !== false}
        defaultTopics={me.settings?.connectTopics ?? []}
        defaultLanguage={me.settings?.connectLanguage ?? null}
      />
    </div>
  );
}
