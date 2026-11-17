import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Globe2, Lock, MapPin, Shield, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorSelect, getCommunity, getFeedPosts, mapAuthor } from "@/lib/queries";
import { LANGUAGE_MAP } from "@/lib/constants";
import { countryName } from "@/lib/countries";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CommunityBadges, CreateEventDialog, EditCommunityDialog, InviteMemberDialog, JoinCommunityButton, JoinRequests, MemberManager } from "@/components/communities/community-actions";
import type { JoinRequestView } from "@/components/communities/community-actions";
import { CommunityFeed } from "@/components/communities/community-feed";
import { flagEmoji, timeAgo } from "@/lib/utils";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const community = await db.community.findUnique({
    where: { slug },
    select: { name: true, description: true },
  });
  return community
    ? { title: community.name, description: community.description.slice(0, 160) }
    : { title: "Community" };
}

export const dynamic = "force-dynamic";

const ORGANIZER_ROLES = ["OWNER", "ADMIN", "MODERATOR"];

export default async function CommunityPage({ params }: Params) {
  const me = await getCurrentUser();
  if (!me) return null;
  const { slug } = await params;
  const community = await getCommunity(slug, me.id);
  if (!community) notFound();

  const role = community.viewerRole;
  const isMember = Boolean(role);
  const isOrganizer = role ? ORGANIZER_ROLES.includes(role) : false;
  const isManager = role === "OWNER" || role === "ADMIN";
  const canSeeContent = community.type !== "PRIVATE" || isMember;

  const [feed, request, pendingRequests, memberRows] = await Promise.all([
    canSeeContent
      ? getFeedPosts({ viewerId: me.id, mode: "latest", communityId: community.id, limit: 10 })
      : Promise.resolve({ items: [], nextCursor: null }),
    db.communityInvitation.findUnique({
      where: { communityId_inviteeId: { communityId: community.id, inviteeId: me.id } },
      select: { status: true },
    }),
    isManager
      ? db.communityInvitation.findMany({
          where: { communityId: community.id, status: "REQUESTED" },
          orderBy: { createdAt: "asc" },
          take: 30,
          include: {
            invitee: {
              select: {
                username: true,
                profile: { select: { displayName: true, avatarUrl: true } },
              },
            },
          },
        })
      : Promise.resolve(
          [] as {
            id: string;
            createdAt: Date;
            invitee: { username: string; profile: { displayName: string | null; avatarUrl: string | null } | null };
          }[]
        ),
    isManager
      ? db.communityMember.findMany({
          where: { communityId: community.id },
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
          take: 100,
          include: { user: { select: authorSelect } },
        })
      : Promise.resolve(
          [] as {
            role: string;
            joinedAt: Date;
            user: {
              id: string;
              username: string;
              verified: boolean;
              profile: { displayName: string; avatarUrl: string | null; countryCode: string | null } | null;
            };
          }[]
        ),
  ]);

  const viewer = {
    id: me.id,
    username: me.username,
    displayName: me.profile?.displayName || me.username,
    avatarUrl: me.profile?.avatarUrl ?? null,
  };

  const requests: JoinRequestView[] = pendingRequests.map((invitation) => ({
    id: invitation.id,
    createdAt: invitation.createdAt.toISOString(),
    invitee: {
      username: invitation.invitee.username,
      displayName: invitation.invitee.profile?.displayName ?? invitation.invitee.username,
      avatarUrl: invitation.invitee.profile?.avatarUrl ?? null,
    },
  }));

  const language = (LANGUAGE_MAP as Map<string, { label: string }>).get(community.language);

  return (
    <div className="pb-6">
      <div className="relative h-36 overflow-hidden bg-gradient-to-br from-electric/30 via-ocean/25 to-mint/30 sm:h-48">
        {community.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={community.coverUrl} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      <div className="px-4 sm:px-6">
        <div className="surface-card relative -mt-12 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className="flex h-20 w-20 shrink-0 -translate-y-6 items-center justify-center overflow-hidden rounded-2xl border-4 border-surface bg-surface-3 text-ink-muted shadow-sm sm:h-24 sm:w-24">
              {community.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={community.imageUrl} alt={community.name} className="h-full w-full object-cover" />
              ) : (
                <Users className="h-8 w-8" />
              )}
            </span>

            <div className="min-w-0 flex-1 sm:-mt-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{community.name}</h1>
                {role && role !== "MEMBER" && (
                  <Badge variant="default">
                    <Shield className="h-3 w-3" /> {role.toLowerCase()}
                  </Badge>
                )}
              </div>
              <div className="mt-2">
                <CommunityBadges type={community.type} countryCode={community.countryCode} />
              </div>
              <p className="mt-3 whitespace-pre-wrap text-[13.5px] leading-6 text-ink-muted">{community.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-faint">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> {community.counts.members.toLocaleString()} members
                </span>
                <span>{community.counts.posts.toLocaleString()} posts</span>
                {language && (
                  <span className="inline-flex items-center gap-1.5">
                    <Globe2 className="h-3.5 w-3.5" /> {language.label}
                  </span>
                )}
                <span>Created {timeAgo(community.createdAt)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
              <JoinCommunityButton
                slug={community.slug}
                type={community.type}
                viewerRole={role}
                className="sm:w-40"
              />
              {isOrganizer && <InviteMemberDialog slug={community.slug} />}
              {isManager && (
                <EditCommunityDialog
                  slug={community.slug}
                  initial={{
                    name: community.name,
                    description: community.description,
                    type: community.type,
                    guidelines: community.guidelines,
                    countryCode: community.countryCode,
                    imageUrl: community.imageUrl,
                    coverUrl: community.coverUrl,
                  }}
                />
              )}
            </div>
          </div>

          {request?.status === "REQUESTED" && !isMember && (
            <p className="mt-4 rounded-xl bg-ocean/10 px-3 py-2 text-[12.5px] font-medium text-ocean">
              Your request to join is waiting for an organizer to review it.
            </p>
          )}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            {canSeeContent ? (
              <CommunityFeed
                viewer={viewer}
                communitySlug={community.slug}
                communityId={community.id}
                initialItems={feed.items}
                initialCursor={feed.nextCursor}
                canPost={isMember}
                canSee={isMember || community.type !== "PRIVATE"}
              />
            ) : (
              <div className="surface-card flex flex-col items-center px-6 py-14 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <Lock className="h-6 w-6" />
                </div>
                <h2 className="font-display text-lg font-semibold text-ink">{community.name} is private</h2>
                <p className="mt-2 max-w-sm text-[13.5px] leading-6 text-ink-muted">
                  Ask an organizer for an invitation to see posts, members and events here.
                </p>
              </div>
            )}

            {community.events.length > 0 && (
              <section className="surface-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                    <CalendarDays className="h-4 w-4 text-brand" /> Upcoming events
                  </h2>
                  {isOrganizer && <CreateEventDialog slug={community.slug} />}
                </div>
                <ul className="space-y-2">
                  {community.events.map((event) => (
                    <li key={event.id} className="rounded-xl border border-line bg-surface-2 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-semibold text-ink">{event.title}</p>
                          {event.description && (
                            <p className="mt-1 line-clamp-2 text-[12.5px] leading-5 text-ink-muted">{event.description}</p>
                          )}
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-faint">
                            <span>
                              {new Date(event.startsAt).toLocaleString(undefined, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                            {event.locationText && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {event.locationText}
                              </span>
                            )}
                          </div>
                        </div>
                        {event.onlineUrl && (
                          <a
                            href={event.onlineUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="shrink-0 text-[12px] font-semibold text-brand hover:underline"
                          >
                            Join link
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {isOrganizer && community.events.length === 0 && (
              <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <h2 className="text-[14px] font-semibold text-ink">Host something together</h2>
                  <p className="mt-0.5 text-[12.5px] text-ink-muted">Schedule a meetup, watch party or discussion.</p>
                </div>
                <CreateEventDialog slug={community.slug} />
              </div>
            )}

            {isManager && (
              <section className="surface-card p-4">
                <h2 className="text-[14px] font-semibold text-ink">Join requests</h2>
                <div className="mt-2.5">
                  <JoinRequests requests={requests} />
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            <section className="surface-card p-4">
              <h2 className="text-[14px] font-semibold text-ink">About</h2>
              <dl className="mt-3 space-y-2 text-[12.5px]">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-faint">Privacy</dt>
                  <dd className="font-medium text-ink">
                    {community.type === "PUBLIC" ? "Public" : community.type === "PRIVATE" ? "Private" : "Restricted"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-faint">Language</dt>
                  <dd className="font-medium text-ink">{language?.label ?? community.language}</dd>
                </div>
                {community.countryCode && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink-faint">Country</dt>
                    <dd className="font-medium text-ink">
                      {flagEmoji(community.countryCode)} {countryName(community.countryCode)}
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-faint">Owner</dt>
                  <dd>
                    <Link href={`/profile/${community.owner.username}`} className="font-medium text-brand hover:underline">
                      {community.owner.displayName}
                    </Link>
                  </dd>
                </div>
              </dl>
              {community.guidelines && (
                <div className="mt-3 border-t border-line pt-3">
                  <h3 className="text-[12.5px] font-semibold text-ink">House rules</h3>
                  <p className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-5 text-ink-muted">{community.guidelines}</p>
                </div>
              )}
            </section>

            <section className="surface-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-ink">Members</h2>
                <span className="text-[11.5px] text-ink-faint">{community.counts.members.toLocaleString()}</span>
              </div>
              {isManager && memberRows.length > 0 ? (
                <MemberManager
                  slug={community.slug}
                  isOwner={role === "OWNER"}
                  members={memberRows.map((member) => ({
                    ...mapAuthor(member.user),
                    role: member.role,
                    joinedAt: member.joinedAt.toISOString(),
                  }))}
                />
              ) : (
                <ul className="space-y-2">
                  {community.members.slice(0, 12).map((member) => (
                    <li key={member.id} className="flex items-center gap-2.5">
                      <Avatar src={member.avatarUrl} name={member.displayName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/profile/${member.username}`}
                          className="block truncate text-[12.5px] font-semibold text-ink hover:text-brand"
                        >
                          {member.displayName}
                        </Link>
                        <p className="truncate text-[10.5px] text-ink-faint">@{member.username}</p>
                      </div>
                      {member.role !== "MEMBER" && <Badge variant="muted">{member.role.toLowerCase()}</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
