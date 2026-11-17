import type { Metadata } from "next";
import { Timer } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getStoryFeed } from "@/lib/queries";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { StoryStrip } from "@/components/stories/story-strip";
import { MomentsComposer } from "@/components/stories/moments-composer";
import { MomentsGallery } from "@/components/stories/moments-gallery";

export const metadata: Metadata = { title: "Moments" };
export const dynamic = "force-dynamic";

type Search = { compose?: string };

export default async function MomentsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const me = await getCurrentUser();
  if (!me) return null;
  const { compose } = await searchParams;
  const groups = await getStoryFeed(me.id);

  const viewer = {
    id: me.id,
    username: me.username,
    displayName: me.profile?.displayName || me.username,
    avatarUrl: me.profile?.avatarUrl ?? null,
  };

  return (
    <div className="space-y-4 px-4 pb-6 pt-5 sm:px-6">
      <PageHeader
        title="Moments"
        description="Small windows into the day. Everything disappears after 24 hours."
        action={<MomentsComposer defaultOpen={compose === "1"} />}
      />

      <StoryStrip stories={groups} viewer={viewer} />

      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-ink">Live moments</h2>
        <span className="text-[11.5px] text-ink-faint">{groups.reduce((sum, group) => sum + group.stories.length, 0)} active</span>
      </div>

      {groups.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={<Timer className="h-6 w-6" />}
            title="No moments yet"
            description="When you or people you follow share a moment, it will appear here for 24 hours."
          />
        </div>
      ) : (
        <MomentsGallery groups={groups} viewer={viewer} />
      )}
    </div>
  );
}
