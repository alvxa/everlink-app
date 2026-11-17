import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  Globe2,
  Languages,
  Link2,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { authorSelect, getFeedPosts, getProfile, mapAuthor } from "@/lib/queries";
import { countryName } from "@/lib/countries";
import { LANGUAGE_MAP } from "@/lib/constants";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProfileActions } from "@/components/profile/profile-actions";
import { ProfileAvatarUploader, ProfileCoverUploader } from "@/components/profile/profile-media";
import { PostList } from "@/components/feed/post-list";
import { cn, flagEmoji, formatCount } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ username: string }>; searchParams: Promise<{ tab?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function ProfilePage({ params, searchParams }: Props) {
  const { username } = await params;
  const { tab } = await searchParams;
  const me = await getCurrentUser();
  if (!me) return null;

  const profile = await getProfile(username, me.id);
  if (!profile) notFound();

  const viewer = {
    id: me.id,
    username: me.username,
    displayName: me.profile?.displayName || me.username,
    avatarUrl: me.profile?.avatarUrl ?? null,
  };

  const activeTab = tab === "about" || tab === "followers" || tab === "following" ? tab : "posts";
  const hidden = profile.viewer.blocked || profile.viewer.blockedMe;
  const mediaProfile = {
    displayName: profile.displayName,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    coverUrl: profile.coverUrl,
    countryCode: profile.countryCode,
    website: profile.website,
    pronouns: profile.pronouns,
  };

  const [feed, people] = await Promise.all([
    !hidden && activeTab === "posts"
      ? getFeedPosts({ viewerId: me.id, authorId: profile.id, limit: 10 })
      : Promise.resolve({ items: [], nextCursor: null }),
    activeTab === "followers" || activeTab === "following"
      ? db.follow.findMany({
          where: activeTab === "followers" ? { followingId: profile.id } : { followerId: profile.id },
          orderBy: { createdAt: "desc" },
          take: 60,
          include: {
            follower: { select: authorSelect },
            following: { select: authorSelect },
          },
        })
      : Promise.resolve([]),
  ]);

  const peopleList = people.map((row) => mapAuthor(activeTab === "followers" ? row.follower : row.following));

  const tabs = [
    { key: "posts", label: `Posts (${profile.counts.posts})` },
    { key: "about", label: "About" },
    { key: "followers", label: `Followers (${profile.counts.followers})` },
    { key: "following", label: `Following (${profile.counts.following})` },
  ];

  return (
    <div className="pb-8">
      <ProfileCoverUploader profile={mediaProfile} isSelf={profile.viewer.isSelf} />

      <div className="px-4 sm:px-6">
        <div className="-mt-11 flex items-end justify-between gap-3 sm:-mt-12">
          <ProfileAvatarUploader profile={mediaProfile} isSelf={profile.viewer.isSelf} />
          <div className="pb-1">
            <ProfileActions
              username={profile.username}
              userId={profile.id}
              isSelf={profile.viewer.isSelf}
              isFollowing={profile.viewer.isFollowing}
              friendStatus={profile.viewer.friendStatus}
              friendDirection={profile.viewer.friendDirection}
              blocked={profile.viewer.blocked}
              blockedMe={profile.viewer.blockedMe}
            />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-[24px] font-bold tracking-tight text-ink">{profile.displayName}</h1>
            {profile.verified && <BadgeCheck className="h-5 w-5 text-ocean" aria-label="Verified" />}
            {profile.role !== "USER" && (
              <Badge variant={profile.role === "ADMIN" ? "default" : "mint"}>
                {profile.role === "ADMIN" ? (
                  <>
                    <ShieldCheck className="h-3 w-3" /> Admin
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3 w-3" /> Moderator
                  </>
                )}
              </Badge>
            )}
          </div>
          <p className="text-[13.5px] text-ink-faint">
            @{profile.username}
            {profile.pronouns ? ` · ${profile.pronouns}` : ""}
          </p>
          {profile.bio && <p className="mt-2.5 max-w-xl whitespace-pre-wrap text-[14px] leading-6 text-ink-muted">{profile.bio}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-ink-muted">
            {profile.countryCode && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {flagEmoji(profile.countryCode)} {countryName(profile.countryCode)}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> Joined{" "}
              {new Date(profile.joinedAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>
            {profile.languages.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Languages className="h-3.5 w-3.5" />
                {profile.languages
                  .slice(0, 3)
                  .map((l) => (LANGUAGE_MAP as Map<string, { label: string }>).get(l.code)?.label ?? l.code.toUpperCase())
                  .join(", ")}
              </span>
            )}
            {profile.website && (
              <a
                href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 text-ocean hover:underline"
              >
                <Link2 className="h-3.5 w-3.5" /> {profile.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>

          <div className="mt-4 flex max-w-md flex-wrap gap-2">
            {[
              { label: "posts", value: profile.counts.posts },
              { label: "followers", value: profile.counts.followers },
              { label: "following", value: profile.counts.following },
              { label: "friends", value: profile.counts.friends },
            ].map((item) => (
              <div key={item.label} className="min-w-[72px] flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2 dark:border-white/10 dark:bg-white/[0.035]">
                <strong className="font-display text-[17px] font-bold text-ink">{formatCount(item.value)}</strong>
                <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{item.label}</span>
              </div>
            ))}
          </div>
          {!profile.viewer.isSelf && profile.counts.mutuals > 0 && (
            <span className="mt-2 inline-flex items-center gap-1 text-[12px] text-ink-muted">
              <Users className="h-3.5 w-3.5" /> {profile.counts.mutuals} mutual connections
            </span>
          )}
        </div>

        <div className="mt-4 flex gap-1 overflow-x-auto border-b border-line dark:border-white/10">
          {tabs.map((item) => (
            <Link
              key={item.key}
              href={item.key === "posts" ? `/profile/${profile.username}` : `/profile/${profile.username}?tab=${item.key}`}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition",
                activeTab === item.key
                  ? "border-brand text-brand dark:border-fuchsia-400 dark:text-[#e9d5ff] dark:drop-shadow-[0_0_10px_rgba(192,38,211,.55)]"
                  : "border-transparent text-ink-muted hover:text-ink"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="mt-4">
          {hidden ? (
            <div className="surface-card flex items-center gap-3 p-5 text-[13.5px] text-ink-muted">
              <ShieldCheck className="h-5 w-5 text-ink-faint" /> Some content is hidden because of a block between you and this account.
            </div>
          ) : activeTab === "posts" ? (
            <PostList
              posts={feed.items}
              viewer={viewer}
              empty={
                <div className="surface-card p-6 text-center">
                  <Sparkles className="mx-auto mb-2 h-6 w-6 text-brand" />
                  <p className="text-[13.5px] font-medium text-ink">No posts yet</p>
                  <p className="mt-1 text-[12.5px] text-ink-muted">
                    {profile.viewer.isSelf ? "Share your first update from the home feed." : "When they post, it will show up here."}
                  </p>
                </div>
              }
            />
          ) : activeTab === "about" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <section className="surface-card p-4">
                <h2 className="mb-2 text-[13.5px] font-semibold text-ink">Bio</h2>
                <p className="whitespace-pre-wrap text-[13px] leading-6 text-ink-muted">
                  {profile.bio || "This person has not written a bio yet."}
                </p>
              </section>
              <section className="surface-card p-4">
                <h2 className="mb-2 text-[13.5px] font-semibold text-ink">Interests</h2>
                <div className="flex flex-wrap gap-1.5">
                  {profile.interests.length ? (
                    profile.interests.map((interest) => (
                      <Link
                        key={interest}
                        href={`/explore?interest=${encodeURIComponent(interest)}`}
                        className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[12px] font-medium text-ink-muted hover:border-brand/40 hover:text-brand"
                      >
                        {interest}
                      </Link>
                    ))
                  ) : (
                    <p className="text-[13px] text-ink-faint">No interests listed.</p>
                  )}
                </div>
              </section>
              <section className="surface-card p-4">
                <h2 className="mb-2 text-[13.5px] font-semibold text-ink">Languages</h2>
                {profile.languages.length ? (
                  <ul className="space-y-1.5">
                    {profile.languages.map((language) => (
                      <li key={language.code} className="flex items-center justify-between text-[13px] text-ink-muted">
                        <span>
                          <Globe2 className="mr-1.5 inline h-3.5 w-3.5 text-ink-faint" />
                          {(LANGUAGE_MAP as Map<string, { label: string }>).get(language.code)?.label ?? language.code.toUpperCase()}
                        </span>
                        <span className="text-[11.5px] capitalize text-ink-faint">{language.proficiency.toLowerCase()}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-ink-faint">No languages listed.</p>
                )}
              </section>
              <section className="surface-card p-4">
                <h2 className="mb-2 text-[13.5px] font-semibold text-ink">Community</h2>
                <p className="flex items-center gap-2 text-[13px] text-ink-muted">
                  <Users className="h-4 w-4 text-ink-faint" /> {profile.counts.communities} communities created
                </p>
                <p className="mt-1.5 flex items-center gap-2 text-[13px] text-ink-muted">
                  <MessageCircle className="h-4 w-4 text-ink-faint" /> {profile.counts.friends} friends on Everlink
                </p>
              </section>
            </div>
          ) : (
            <div className="surface-card divide-y divide-line">
              {peopleList.length === 0 ? (
                <p className="p-6 text-center text-[13px] text-ink-faint">No one to show here yet.</p>
              ) : (
                peopleList.map((person) => (
                  <Link
                    key={person.id}
                    href={`/profile/${person.username}`}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2"
                  >
                    <Avatar src={person.avatarUrl} name={person.displayName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 truncate text-[13.5px] font-semibold text-ink">
                        {person.displayName}
                        {person.verified && <BadgeCheck className="h-3.5 w-3.5 text-ocean" />}
                      </p>
                      <p className="truncate text-[11.5px] text-ink-faint">
                        @{person.username}
                        {person.countryCode ? ` · ${flagEmoji(person.countryCode)}` : ""}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
