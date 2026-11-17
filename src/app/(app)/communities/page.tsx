import type { Metadata } from "next";
import Link from "next/link";
import { Globe2, Search, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCommunityList } from "@/lib/queries";
import { COUNTRIES } from "@/lib/countries";
import { LANGUAGES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, TabNav } from "@/components/ui/misc";
import { CreateCommunityDialog, InvitationsPanel, JoinCommunityButton } from "@/components/communities/community-actions";
import { flagEmoji } from "@/lib/utils";
import type { InvitationView } from "@/components/communities/community-actions";
import type { CommunityDTO } from "@/lib/types";

export const metadata: Metadata = { title: "Communities" };
export const dynamic = "force-dynamic";

type Search = { q?: string; type?: string; country?: string; language?: string; joined?: string };

export default async function CommunitiesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const me = await getCurrentUser();
  if (!me) return null;
  const params = await searchParams;
  const joined = params.joined === "1";

  const [communities, invitations, pendingRequests] = await Promise.all([
    getCommunityList({
      search: params.q,
      type: params.type,
      country: params.country,
      language: params.language,
      viewerId: me.id,
      joined,
      limit: 36,
    }),
    db.communityInvitation.findMany({
      where: { inviteeId: me.id, status: { in: ["PENDING", "REQUESTED"] } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        community: { select: { slug: true, name: true, imageUrl: true, type: true } },
        inviter: { select: { username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      },
    }),
    db.communityInvitation.count({
      where: {
        status: "REQUESTED",
        community: { members: { some: { userId: me.id, role: { in: ["OWNER", "ADMIN"] } } } },
      },
    }),
  ]);

  const invitationViews: InvitationView[] = invitations.map((invitation) => ({
    id: invitation.id,
    status: invitation.status,
    createdAt: invitation.createdAt.toISOString(),
    isRequest: invitation.inviterId === invitation.inviteeId,
    community: invitation.community,
    inviter: {
      username: invitation.inviter.username,
      displayName: invitation.inviter.profile?.displayName ?? invitation.inviter.username,
      avatarUrl: invitation.inviter.profile?.avatarUrl ?? null,
    },
  }));

  const joinedCount = communities.filter((community) => community.viewerRole).length;

  return (
    <div className="space-y-4 px-4 pb-6 pt-5 sm:px-6">
      <PageHeader
        title="Communities"
        description="Find your people. Build spaces around the things you care about."
        action={<CreateCommunityDialog />}
      />

      <TabNav
        active={joined ? "My communities" : "Discover"}
        items={[
          { label: "Discover", href: "/communities" },
          { label: "My communities", href: "/communities?joined=1", count: joined ? joinedCount : undefined },
        ]}
      />

      <InvitationsPanel invitations={invitationViews} />

      {pendingRequests > 0 && (
        <p className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[12.5px] text-ink-muted">
          You have {pendingRequests} pending join {pendingRequests === 1 ? "request" : "requests"} to review as an organizer.
        </p>
      )}

      <form action="/communities" method="get" className="surface-card flex flex-col gap-2 p-3 sm:flex-row sm:flex-wrap sm:items-center">
        {joined && <input type="hidden" name="joined" value="1" />}
        <div className="relative w-full sm:min-w-[200px] sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search communities..."
            className="h-10 w-full rounded-xl border border-line bg-surface-2 pl-9 pr-3 text-[13.5px] text-ink outline-none transition focus:border-fuchsia-400/50 focus:bg-surface-2 dark:border-white/10 dark:bg-white/[0.04] dark:focus:bg-white/[0.06]"
          />
        </div>
        <select
          name="type"
          defaultValue={params.type ?? ""}
          aria-label="Community privacy"
          className="h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-[13px] text-ink outline-none sm:w-auto sm:max-w-[150px] dark:border-white/10 dark:bg-white/[0.04]"
        >
          <option value="">Any privacy</option>
          <option value="PUBLIC">Public</option>
          <option value="RESTRICTED">Restricted</option>
          <option value="PRIVATE">Private</option>
        </select>
        <select
          name="country"
          defaultValue={params.country ?? ""}
          aria-label="Country"
          className="h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-[13px] text-ink outline-none sm:w-auto sm:max-w-[180px] dark:border-white/10 dark:bg-white/[0.04]"
        >
          <option value="">Any country</option>
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
        <select
          name="language"
          defaultValue={params.language ?? ""}
          aria-label="Language"
          className="h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-[13px] text-ink outline-none sm:w-auto sm:max-w-[165px] dark:border-white/10 dark:bg-white/[0.04]"
        >
          <option value="">Any language</option>
          {LANGUAGES.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" className="w-full sm:w-auto">
          Apply
        </Button>
      </form>

      {communities.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title={joined ? "You have not joined a community yet" : "No communities match that search"}
          description={
            joined
              ? "Discover public communities or start your own space."
              : "Try another keyword, or create the community you are looking for."
          }
          action={
            joined ? (
              <Link href="/communities" className="text-[13px] font-semibold text-brand hover:underline">
                Browse communities
              </Link>
            ) : (
              <CreateCommunityDialog />
            )
          }
        />
      ) : (
        <ul className="stagger-list grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-reveal>
          {communities.map((community) => (
            <CommunityCard key={community.id} community={community} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CommunityCard({ community }: { community: CommunityDTO }) {
  return (
    <li className="surface-card card-lift glass-sheen flex flex-col overflow-hidden">
      <Link href={`/communities/${community.slug}`} className="block">
        <div className="relative h-24 w-full overflow-hidden bg-gradient-to-br from-fuchsia-500/35 via-electric/25 to-ocean/30">
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_0%,rgba(255,255,255,.18),transparent_55%)]" />
          {community.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={community.coverUrl} alt="" className="relative h-full w-full object-cover" />
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-3.5">
        <div className="relative z-10 -mt-9 mb-2 flex items-end justify-between">
          <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-2 border-line bg-surface-3 text-ink-muted shadow-sm ring-2 ring-surface dark:border-white/15 dark:shadow-[0_0_24px_-10px_rgba(192,38,211,.8)] dark:ring-[#0b0c1a]">
            {community.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={community.imageUrl} alt={community.name} className="h-full w-full object-cover" />
            ) : (
              <Users className="h-5 w-5 text-brand dark:text-fuchsia-200" />
            )}
          </span>
          <div className="flex items-center gap-1.5 pb-1 text-[11.5px] text-ink-faint">
            <Globe2 className="h-3.5 w-3.5" />
            {community.memberCount} {community.memberCount === 1 ? "member" : "members"}
          </div>
        </div>

        <Link href={`/communities/${community.slug}`} className="text-[15px] font-semibold text-ink hover:text-brand">
          {community.name}
        </Link>
        <p className="mt-1 line-clamp-2 min-h-[36px] text-[12.5px] leading-[18px] text-ink-muted">{community.description}</p>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Badge variant={community.type === "PUBLIC" ? "mint" : community.type === "PRIVATE" ? "danger" : "ocean"}>
            {community.type === "PUBLIC" ? "Public" : community.type === "PRIVATE" ? "Private" : "Restricted"}
          </Badge>
          {community.countryCode && (
            <Badge variant="outline">
              {flagEmoji(community.countryCode)} {community.countryCode}
            </Badge>
          )}
          {community.viewerRole && community.viewerRole !== "MEMBER" && (
            <Badge variant="default">{community.viewerRole.toLowerCase()}</Badge>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
          <span className="whitespace-nowrap text-[11.5px] text-ink-faint">Active space</span>
          <JoinCommunityButton
            slug={community.slug}
            type={community.type}
            viewerRole={community.viewerRole}
            size="sm"
          />
        </div>
      </div>
    </li>
  );
}
