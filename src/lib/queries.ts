import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import type {
  AuthorDTO,
  CommentDTO,
  CommunityDTO,
  FeedPostDTO,
  MediaDTO,
  NotificationDTO,
  StoryDTO,
} from "./types";
import { FEED_PAGE_SIZE } from "./constants";

export const authorSelect = {
  id: true,
  username: true,
  verified: true,
  profile: { select: { displayName: true, avatarUrl: true, countryCode: true } },
} satisfies Prisma.UserSelect;

type AuthorRow = Prisma.UserGetPayload<{ select: typeof authorSelect }>;

export function mapAuthor(user: AuthorRow): AuthorDTO {
  return {
    id: user.id,
    username: user.username,
    displayName: user.profile?.displayName || user.username,
    avatarUrl: user.profile?.avatarUrl ?? null,
    verified: user.verified,
    countryCode: user.profile?.countryCode ?? null,
  };
}

const mediaSelect = {
  id: true,
  url: true,
  mime: true,
  type: true,
  alt: true,
  width: true,
  height: true,
} satisfies Prisma.PostMediaSelect;

function postSelect(viewerId: string | null) {
  const viewer = viewerId ?? "__anonymous__";
  return {
    id: true,
    type: true,
    body: true,
    linkUrl: true,
    visibility: true,
    countryCode: true,
    createdAt: true,
    editedAt: true,
    author: { select: authorSelect },
    community: { select: { id: true, slug: true, name: true, imageUrl: true } },
    media: { orderBy: { position: "asc" }, select: mediaSelect },
    hashtags: { select: { hashtag: { select: { tag: true } } } },
    _count: { select: { comments: true, reactions: true, reposts: true } },
    reactions: { where: { userId: viewer }, select: { type: true } },
    bookmarks: { where: { userId: viewer }, select: { postId: true } },
    pollOptions: {
      orderBy: { position: "asc" },
      select: { id: true, text: true, votes: { select: { userId: true } } },
    },
    repostOf: {
      select: {
        id: true,
        body: true,
        type: true,
        createdAt: true,
        author: { select: authorSelect },
        media: { orderBy: { position: "asc" }, select: mediaSelect },
        community: { select: { id: true, slug: true, name: true, imageUrl: true } },
      },
    },
  } satisfies Prisma.PostSelect;
}

export type PostRow = Prisma.PostGetPayload<{ select: ReturnType<typeof postSelect> }>;

export function mapPost(post: PostRow): FeedPostDTO {
  const totalVotes = post.pollOptions.reduce((sum, option) => sum + option.votes.length, 0);
  const viewerOption = post.pollOptions.find((option) => option.votes.some((v) => v.userId !== "__anonymous__"));
  return {
    id: post.id,
    type: post.type,
    body: post.body,
    linkUrl: post.linkUrl,
    visibility: post.visibility,
    countryCode: post.countryCode,
    createdAt: post.createdAt.toISOString(),
    editedAt: post.editedAt?.toISOString() ?? null,
    author: mapAuthor(post.author),
    community: post.community,
    media: post.media as MediaDTO[],
    hashtags: post.hashtags.map((h) => h.hashtag.tag),
    counts: {
      comments: post._count.comments,
      reactions: post._count.reactions,
      reposts: post._count.reposts,
    },
    viewerReaction: post.reactions[0]?.type ?? null,
    viewerBookmarked: post.bookmarks.length > 0,
    poll:
      post.pollOptions.length > 0
        ? {
            options: post.pollOptions.map((option) => ({
              id: option.id,
              text: option.text,
              votes: option.votes.length,
            })),
            totalVotes,
            viewerOptionId: viewerOption?.id ?? null,
          }
        : null,
    repostOf: post.repostOf
      ? {
          id: post.repostOf.id,
          body: post.repostOf.body,
          type: post.repostOf.type,
          createdAt: post.repostOf.createdAt.toISOString(),
          author: mapAuthor(post.repostOf.author),
          media: post.repostOf.media as MediaDTO[],
          community: post.repostOf.community,
        }
      : null,
  };
}

export async function getFollowingIds(userId: string): Promise<string[]> {
  const rows = await db.follow.findMany({ where: { followerId: userId }, select: { followingId: true } });
  return rows.map((r) => r.followingId);
}

export function visiblePostWhere(viewerId: string | null, followingIds: string[]): Prisma.PostWhereInput {
  if (!viewerId) return { deletedAt: null, visibility: "PUBLIC" };
  return {
    deletedAt: null,
    OR: [
      { authorId: viewerId },
      { visibility: "PUBLIC" },
      { AND: [{ visibility: "FOLLOWERS" }, { authorId: { in: followingIds } }] },
      { AND: [{ visibility: "COMMUNITY" }, { community: { members: { some: { userId: viewerId } } } }] },
    ],
  };
}

export type FeedOptions = {
  viewerId: string | null;
  mode?: "for-you" | "following" | "latest" | "bookmarks";
  cursor?: string | null;
  limit?: number;
  authorId?: string;
  communityId?: string;
  countryCode?: string;
  hashtag?: string;
  search?: string;
};

export async function getFeedPosts(options: FeedOptions) {
  const limit = options.limit ?? FEED_PAGE_SIZE;
  const followingIds = options.viewerId ? await getFollowingIds(options.viewerId) : [];
  const where: Prisma.PostWhereInput = {
    ...visiblePostWhere(options.viewerId, followingIds),
    ...(options.authorId ? { authorId: options.authorId } : {}),
    ...(options.communityId ? { communityId: options.communityId } : {}),
    ...(options.countryCode ? { countryCode: options.countryCode.toUpperCase() } : {}),
    ...(options.hashtag ? { hashtags: { some: { hashtag: { tag: options.hashtag.toLowerCase() } } } } : {}),
    ...(options.mode === "following" && options.viewerId
      ? { authorId: { in: [...followingIds, options.viewerId] } }
      : {}),
    ...(options.mode === "bookmarks" && options.viewerId
      ? { bookmarks: { some: { userId: options.viewerId } } }
      : {}),
  };

  if (options.search?.trim()) {
    const q = options.search.trim();
    where.AND = [
      {
        OR: [
          { body: { contains: q, mode: "insensitive" } },
          { author: { username: { contains: q, mode: "insensitive" } } },
          { author: { profile: { displayName: { contains: q, mode: "insensitive" } } } },
          { hashtags: { some: { hashtag: { tag: q.replace(/^#/, "").toLowerCase() } } } },
        ],
      },
    ];
  }

  const rows = await db.post.findMany({
    where,
    select: postSelect(options.viewerId),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    items: page.map(mapPost),
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  };
}

export async function getPostById(id: string, viewerId: string | null) {
  const row = await db.post.findFirst({
    where: { id, deletedAt: null },
    select: postSelect(viewerId),
  });
  if (!row) return null;
  const post = mapPost(row);
  if (post.visibility === "COMMUNITY") {
    const allowed = await canViewPost(id, viewerId);
    if (!allowed) return null;
  }
  if (post.visibility === "FOLLOWERS" && viewerId) {
    const follows = await db.follow.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: post.author.id } },
    });
    if (!follows && post.author.id !== viewerId) return null;
  }
  return post;
}

async function canViewPost(postId: string, viewerId: string | null) {
  if (!viewerId) return false;
  const membership = await db.post.findFirst({
    where: {
      id: postId,
      OR: [{ authorId: viewerId }, { community: { members: { some: { userId: viewerId } } } }],
    },
    select: { id: true },
  });
  return Boolean(membership);
}

export async function canViewWorldPost(postId: string, viewerId: string | null) {
  return canViewPost(postId, viewerId);
}

type CommentRow = Prisma.CommentGetPayload<{
  select: {
    id: true;
    body: true;
    createdAt: true;
    parentId: true;
    author: { select: typeof authorSelect };
    reactions: { select: { type: true } };
  };
}>;

export async function getComments(postId: string, viewerId: string | null): Promise<CommentDTO[]> {
  const rows = await db.comment.findMany({
    where: { postId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      createdAt: true,
      parentId: true,
      author: { select: authorSelect },
      reactions: { where: { userId: viewerId ?? "__anonymous__" }, select: { type: true } },
    },
  });
  const map = new Map<string, CommentDTO>();
  for (const row of rows as CommentRow[]) {
    map.set(row.id, {
      id: row.id,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      parentId: row.parentId,
      author: mapAuthor(row.author),
      viewerReaction: row.reactions[0]?.type ?? null,
      replies: [],
    });
  }
  const roots: CommentDTO[] = [];
  for (const comment of map.values()) {
    if (comment.parentId && map.has(comment.parentId)) map.get(comment.parentId)!.replies.push(comment);
    else roots.push(comment);
  }
  return roots;
}

export type ProfileData = Awaited<ReturnType<typeof getProfile>>;

export async function getProfile(username: string, viewerId: string | null) {
  const user = await db.user.findFirst({
    where: { username: username.toLowerCase(), status: "ACTIVE", deletedAt: null },
    select: {
      id: true,
      username: true,
      role: true,
      verified: true,
      createdAt: true,
      lastActiveAt: true,
      email: true,
      profile: true,
      settings: { select: { showCountry: true, discoverable: true, showOnlineStatus: true } },
      interests: { select: { name: true }, orderBy: { name: "asc" } },
      languages: { select: { code: true, proficiency: true } },
      _count: {
        select: {
          posts: { where: { deletedAt: null } },
          followers: true,
          following: true,
          communitiesOwned: true,
        },
      },
    },
  });
  if (!user) return null;

  const isSelf = viewerId === user.id;
  const [follow, friendOut, friendIn, blockedByViewer, blocksViewer, friendCount, mutuals] = await Promise.all([
    viewerId
      ? db.follow.findUnique({
          where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
          select: { id: true },
        })
      : null,
    viewerId
      ? db.friendship.findUnique({
          where: { requesterId_addresseeId: { requesterId: viewerId, addresseeId: user.id } },
          select: { status: true },
        })
      : null,
    viewerId
      ? db.friendship.findUnique({
          where: { requesterId_addresseeId: { requesterId: user.id, addresseeId: viewerId } },
          select: { status: true },
        })
      : null,
    viewerId ? db.block.findUnique({ where: { blockerId_blockedId: { blockerId: viewerId, blockedId: user.id } } }) : null,
    viewerId ? db.block.findUnique({ where: { blockerId_blockedId: { blockerId: user.id, blockedId: viewerId } } }) : null,
    db.friendship.count({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: user.id }, { addresseeId: user.id }],
      },
    }),
    viewerId
      ? db.follow.count({
          where: {
            followerId: { in: (await getFollowingIds(viewerId)) },
            followingId: { in: (await db.follow.findMany({ where: { followerId: user.id }, select: { followingId: true } })).map((f) => f.followingId) },
          },
        })
      : 0,
  ]);

  const profile = user.profile;
  const showCountry = isSelf || user.settings?.showCountry !== false;
  return {
    id: user.id,
    username: user.username,
    displayName: profile?.displayName || user.username,
    bio: profile?.bio ?? "",
    avatarUrl: profile?.avatarUrl ?? null,
    coverUrl: profile?.coverUrl ?? null,
    countryCode: showCountry ? profile?.countryCode ?? null : null,
    website: profile?.website ?? null,
    pronouns: profile?.pronouns ?? null,
    role: user.role,
    verified: user.verified,
    joinedAt: user.createdAt.toISOString(),
    lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
    email: isSelf ? user.email : null,
    interests: user.interests.map((i) => i.name),
    languages: user.languages,
    counts: {
      posts: user._count.posts,
      followers: user._count.followers,
      following: user._count.following,
      friends: friendCount,
      communities: user._count.communitiesOwned,
      mutuals,
    },
    viewer: {
      isSelf,
      isFollowing: Boolean(follow),
      friendStatus: (friendOut?.status ?? friendIn?.status ?? null) as string | null,
      friendDirection: friendOut ? ("outgoing" as const) : friendIn ? ("incoming" as const) : null,
      blocked: Boolean(blockedByViewer),
      blockedMe: Boolean(blocksViewer),
    },
  };
}

export type SuggestedPeopleOptions = {
  q?: string;
  interest?: string;
  language?: string;
  country?: string;
  communityId?: string;
  sort?: "popular" | "new" | "recent";
  limit?: number;
  viewerId: string | null;
};

export async function getSuggestedPeople(options: SuggestedPeopleOptions) {
  const limit = options.limit ?? 12;
  const where: Prisma.UserWhereInput = {
    status: "ACTIVE",
    deletedAt: null,
    onboardedAt: { not: null },
    ...(options.viewerId ? { id: { not: options.viewerId } } : {}),
    settings: { discoverable: true },
    ...(options.q
      ? {
          OR: [
            { username: { contains: options.q, mode: "insensitive" } },
            { profile: { displayName: { contains: options.q, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(options.interest ? { interests: { some: { name: options.interest } } } : {}),
    ...(options.language ? { languages: { some: { code: options.language } } } : {}),
    ...(options.country ? { profile: { countryCode: options.country.toUpperCase() } } : {}),
    ...(options.communityId ? { communityMemberships: { some: { communityId: options.communityId } } } : {}),
  };

  if (options.viewerId) {
    const blocked = await db.block.findMany({
      where: {
        OR: [{ blockerId: options.viewerId }, { blockedId: options.viewerId }],
      },
      select: { blockerId: true, blockedId: true },
    });
    const excluded = blocked.map((b) => (b.blockerId === options.viewerId ? b.blockedId : b.blockerId));
    if (excluded.length) where.id = { not: options.viewerId, notIn: excluded };
  }

  const orderBy: Prisma.UserOrderByWithRelationInput[] =
    options.sort === "new"
      ? [{ createdAt: "desc" }]
      : options.sort === "recent"
        ? [{ lastActiveAt: "desc" }]
        : [{ followers: { _count: "desc" } }, { createdAt: "desc" }];

  const rows = await db.user.findMany({
    where,
    orderBy,
    take: limit,
    select: {
      ...authorSelect,
      createdAt: true,
      lastActiveAt: true,
      profile: { select: { displayName: true, avatarUrl: true, countryCode: true, bio: true } },
      interests: { select: { name: true }, take: 5 },
      languages: { select: { code: true }, take: 4 },
      _count: { select: { followers: true, posts: { where: { deletedAt: null } } } },
    },
  });

  return rows.map((row) => ({
    ...mapAuthor(row),
    bio: row.profile?.bio ?? "",
    createdAt: row.createdAt.toISOString(),
    lastActiveAt: row.lastActiveAt?.toISOString() ?? null,
    interests: row.interests.map((i) => i.name),
    languages: row.languages.map((l) => l.code),
    followers: row._count.followers,
    posts: row._count.posts,
  }));
}

export async function getTrendingHashtags(limit = 8) {
  const rows = await db.hashtag.findMany({
    where: { posts: { some: {} } },
    orderBy: [{ count: "desc" }, { tag: "asc" }],
    take: limit,
    select: { tag: true, _count: { select: { posts: true } } },
  });
  return rows.map((row) => ({ tag: row.tag, count: row._count.posts }));
}

export async function getStoryFeed(viewerId: string | null) {
  const followingIds = viewerId ? await getFollowingIds(viewerId) : [];
  const stories = await db.story.findMany({
    where: {
      deletedAt: null,
      expiresAt: { gt: new Date() },
      OR: [
        { audience: "PUBLIC" },
        ...(viewerId ? [{ authorId: viewerId }] : []),
        ...(viewerId ? [{ audience: "FOLLOWERS" as const, authorId: { in: followingIds } }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      mediaUrl: true,
      body: true,
      background: true,
      audience: true,
      createdAt: true,
      expiresAt: true,
      author: { select: authorSelect },
      views: { where: { viewerId: viewerId ?? "__anonymous__" }, select: { id: true } },
      _count: { select: { views: true, reactions: true } },
    },
  });

  const map = new Map<string, { author: AuthorDTO; stories: StoryDTO[] }>();
  for (const story of stories) {
    const author = mapAuthor(story.author);
    const dto: StoryDTO = {
      id: story.id,
      type: story.type,
      mediaUrl: story.mediaUrl,
      body: story.body,
      background: story.background,
      audience: story.audience,
      createdAt: story.createdAt.toISOString(),
      expiresAt: story.expiresAt.toISOString(),
      author,
      viewed: story.views.length > 0,
      reactionCount: story._count.reactions,
      viewCount: story._count.views,
    };
    const bucket = map.get(author.id);
    if (bucket) bucket.stories.push(dto);
    else map.set(author.id, { author, stories: [dto] });
  }
  return Array.from(map.values());
}

export async function getCommunityList(options: {
  search?: string;
  type?: string;
  country?: string;
  language?: string;
  viewerId: string | null;
  joined?: boolean;
  limit?: number;
}) {
  const where: Prisma.CommunityWhereInput = {
    suspendedAt: null,
    ...(options.type ? { type: options.type as "PUBLIC" | "PRIVATE" | "RESTRICTED" } : {}),
    ...(options.country ? { countryCode: options.country.toUpperCase() } : {}),
    ...(options.language ? { language: options.language } : {}),
    ...(options.search
      ? {
          OR: [
            { name: { contains: options.search, mode: "insensitive" } },
            { description: { contains: options.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(options.viewerId && options.joined ? { members: { some: { userId: options.viewerId } } } : {}),
  };

  const rows = await db.community.findMany({
    where,
    orderBy: [{ members: { _count: "desc" } }, { createdAt: "desc" }],
    take: options.limit ?? 24,
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      type: true,
      imageUrl: true,
      coverUrl: true,
      countryCode: true,
      language: true,
      _count: { select: { members: true } },
      members: options.viewerId
        ? { where: { userId: options.viewerId }, select: { role: true } }
        : { where: { userId: "__anonymous__" }, select: { role: true } },
    },
  });

  return rows.map(
    (row): CommunityDTO => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      type: row.type,
      imageUrl: row.imageUrl,
      coverUrl: row.coverUrl,
      countryCode: row.countryCode,
      language: row.language,
      memberCount: row._count.members,
      viewerRole: row.members[0]?.role ?? null,
    })
  );
}

export async function getCommunity(slug: string, viewerId: string | null) {
  const community = await db.community.findFirst({
    where: { slug, suspendedAt: null },
    include: {
      owner: { select: authorSelect },
      members: {
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        take: 24,
        include: { user: { select: authorSelect } },
      },
      events: { orderBy: { startsAt: "asc" }, take: 5 },
      _count: { select: { members: true, posts: { where: { deletedAt: null } } } },
    },
  });
  if (!community) return null;
  const viewerMembership = viewerId
    ? await db.communityMember.findUnique({
        where: { communityId_userId: { communityId: community.id, userId: viewerId } },
      })
    : null;
  return {
    id: community.id,
    slug: community.slug,
    name: community.name,
    description: community.description,
    guidelines: community.guidelines,
    type: community.type,
    imageUrl: community.imageUrl,
    coverUrl: community.coverUrl,
    countryCode: community.countryCode,
    language: community.language,
    createdAt: community.createdAt.toISOString(),
    owner: mapAuthor(community.owner),
    members: community.members.map((m) => ({ ...mapAuthor(m.user), role: m.role, joinedAt: m.joinedAt.toISOString() })),
    events: community.events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt?.toISOString() ?? null,
      locationText: e.locationText,
      onlineUrl: e.onlineUrl,
    })),
    counts: { members: community._count.members, posts: community._count.posts },
    viewerRole: viewerMembership?.role ?? null,
  };
}

export async function getNotifications(userId: string, cursor?: string | null) {
  const rows = await db.notification.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 21,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { actor: { select: authorSelect } },
  });
  const hasMore = rows.length > 20;
  const page = hasMore ? rows.slice(0, 20) : rows;
  return {
    items: page.map(
      (row): NotificationDTO => ({
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        link: row.link,
        readAt: row.readAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        actor: row.actor ? mapAuthor(row.actor) : null,
      })
    ),
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  };
}

export async function getConversationSummaries(userId: string) {
  const memberships = await db.conversationMember.findMany({
    where: { userId, leftAt: null },
    orderBy: { conversation: { lastMessageAt: "desc" } },
    include: {
      conversation: {
        include: {
          members: {
            where: { leftAt: null },
            include: { user: { select: authorSelect } },
          },
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { sender: { select: authorSelect } },
          },
        },
      },
    },
  });

  const rows = await Promise.all(
    memberships.map(async (membership) => {
      const conversation = membership.conversation;
      const lastMessage = conversation.messages[0] ?? null;
      const unread = await db.message.count({
        where: {
          conversationId: conversation.id,
          senderId: { not: userId },
          deletedAt: null,
          ...(membership.lastReadAt ? { createdAt: { gt: membership.lastReadAt } } : {}),
        },
      });
      const others = conversation.members.filter((m) => m.userId !== userId).map((m) => mapAuthor(m.user));
      const title =
        conversation.type === "DIRECT"
          ? others[0]?.displayName ?? "Direct message"
          : conversation.title || "Group conversation";
      return {
        id: conversation.id,
        type: conversation.type,
        title,
        imageUrl: conversation.type === "DIRECT" ? others[0]?.avatarUrl ?? null : null,
        members: conversation.members.map((m) => mapAuthor(m.user)),
        otherUser: conversation.type === "DIRECT" ? others[0] ?? null : null,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              body: lastMessage.body,
              createdAt: lastMessage.createdAt.toISOString(),
              senderId: lastMessage.senderId,
              senderName: mapAuthor(lastMessage.sender).displayName,
            }
          : null,
        lastMessageAt: conversation.lastMessageAt.toISOString(),
        unread,
        muted: membership.muted,
        archived: membership.archived,
      };
    })
  );

  return rows.sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));
}

export async function getConversationMessages(conversationId: string, userId: string, cursor?: string | null) {
  const membership = await db.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!membership || membership.leftAt) return null;

  const rows = await db.message.findMany({
    where: { conversationId, deletedAt: null },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 41,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      sender: { select: authorSelect },
      attachments: true,
      replyTo: { select: { id: true, body: true, sender: { select: authorSelect } } },
    },
  });
  const hasMore = rows.length > 40;
  const page = (hasMore ? rows.slice(0, 40) : rows).reverse();
  return {
    membership,
    items: page.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      editedAt: row.editedAt?.toISOString() ?? null,
      sender: mapAuthor(row.sender),
      attachments: row.attachments,
      replyTo: row.replyTo
        ? {
            id: row.replyTo.id,
            body: row.replyTo.body,
            senderName: mapAuthor(row.replyTo.sender).displayName,
          }
        : null,
    })),
    nextCursor: hasMore ? (page[0]?.id ?? null) : null,
  };
}

export async function markConversationRead(conversationId: string, userId: string) {
  await db.conversationMember.updateMany({
    where: { conversationId, userId },
    data: { lastReadAt: new Date() },
  });
}

export async function getWorldOverview() {
  const [postCountries, profileCountries, communityCountries] = await Promise.all([
    db.post.groupBy({
      by: ["countryCode"],
      where: { countryCode: { not: null }, deletedAt: null, visibility: "PUBLIC" },
      _count: { _all: true },
    }),
    db.profile.groupBy({
      by: ["countryCode"],
      where: { countryCode: { not: null }, user: { status: "ACTIVE", deletedAt: null } },
      _count: { _all: true },
    }),
    db.community.groupBy({
      by: ["countryCode"],
      where: { countryCode: { not: null }, suspendedAt: null },
      _count: { _all: true },
    }),
  ]);

  const merged = new Map<string, { code: string; members: number; posts: number; communities: number }>();
  const ensure = (code: string) => {
    if (!merged.has(code)) merged.set(code, { code, members: 0, posts: 0, communities: 0 });
    return merged.get(code)!;
  };
  for (const row of profileCountries) if (row.countryCode) ensure(row.countryCode).members = row._count._all;
  for (const row of postCountries) if (row.countryCode) ensure(row.countryCode).posts = row._count._all;
  for (const row of communityCountries) if (row.countryCode) ensure(row.countryCode).communities = row._count._all;
  return Array.from(merged.values()).sort((a, b) => b.members + b.posts - (a.members + a.posts));
}

export async function getLiveRooms(limit = 20) {
  const rows = await db.liveRoom.findMany({
    where: { status: "LIVE" },
    orderBy: { startedAt: "desc" },
    take: limit,
    include: {
      host: { select: authorSelect },
      community: { select: { slug: true, name: true } },
      _count: { select: { participants: { where: { leftAt: null } } } },
    },
  });
  return rows.map((room) => ({
    id: room.id,
    title: room.title,
    description: room.description,
    type: room.type,
    topic: room.topic,
    countryCode: room.countryCode,
    startedAt: room.startedAt.toISOString(),
    host: mapAuthor(room.host),
    community: room.community,
    participants: room._count.participants,
  }));
}

export async function getLiveRoom(id: string) {
  const room = await db.liveRoom.findUnique({
    where: { id },
    include: {
      host: { select: authorSelect },
      community: { select: { slug: true, name: true } },
      participants: { where: { leftAt: null }, include: { user: { select: authorSelect } } },
    },
  });
  if (!room) return null;
  return {
    id: room.id,
    title: room.title,
    description: room.description,
    type: room.type,
    status: room.status,
    topic: room.topic,
    countryCode: room.countryCode,
    startedAt: room.startedAt.toISOString(),
    endedAt: room.endedAt?.toISOString() ?? null,
    host: mapAuthor(room.host),
    community: room.community,
    participants: room.participants.map((p) => ({ ...mapAuthor(p.user), role: p.role, muted: p.muted, cameraOn: p.cameraOn })),
  };
}

export type SearchResults = {
  people: Awaited<ReturnType<typeof getSuggestedPeople>>;
  posts: FeedPostDTO[];
  communities: CommunityDTO[];
  hashtags: { tag: string; count: number }[];
};

export async function globalSearch(q: string, viewerId: string | null): Promise<SearchResults> {
  const [people, posts, communities, hashtags] = await Promise.all([
    getSuggestedPeople({ q, viewerId, limit: 6, sort: "popular" }),
    getFeedPosts({ viewerId, search: q, limit: 5 }).then((r) => r.items),
    getCommunityList({ search: q, viewerId, limit: 6 }),
    db.hashtag.findMany({
      where: { tag: { contains: q.replace(/^#/, "").toLowerCase() }, posts: { some: {} } },
      orderBy: { posts: { _count: "desc" } },
      take: 5,
      select: { tag: true, _count: { select: { posts: true } } },
    }).then((rows) => rows.map((row) => ({ tag: row.tag, count: row._count.posts }))),
  ]);
  return { people, posts, communities, hashtags };
}

export async function getAdminOverview() {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [
    users,
    activeUsers,
    newUsers,
    posts,
    comments,
    communities,
    pendingReports,
    reportsToday,
    liveRooms,
    stories,
    suspended,
  ] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.user.count({ where: { deletedAt: null, lastActiveAt: { gte: since7d } } }),
    db.user.count({ where: { createdAt: { gte: since24h } } }),
    db.post.count({ where: { deletedAt: null } }),
    db.comment.count({ where: { deletedAt: null } }),
    db.community.count({ where: { suspendedAt: null } }),
    db.report.count({ where: { status: { in: ["PENDING", "REVIEWING"] } } }),
    db.report.count({ where: { createdAt: { gte: since24h } } }),
    db.liveRoom.count({ where: { status: "LIVE" } }),
    db.story.count({ where: { deletedAt: null, expiresAt: { gt: new Date() } } }),
    db.user.count({ where: { status: "SUSPENDED", deletedAt: null } }),
  ]);

  const signupSeries = await db.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
    FROM "User"
    WHERE "createdAt" >= ${since7d} AND "deletedAt" IS NULL
    GROUP BY 1 ORDER BY 1 ASC
  `;
  const signupByDay = new Map(signupSeries.map((row) => [row.day.toISOString().slice(0, 10), Number(row.count)]));
  const today = new Date();
  const signupWindow = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (6 - index)));
    return { day: day.toISOString(), count: signupByDay.get(day.toISOString().slice(0, 10)) ?? 0 };
  });

  return {
    users,
    activeUsers,
    newUsers,
    posts,
    comments,
    communities,
    pendingReports,
    reportsToday,
    liveRooms,
    stories,
    suspended,
    signupSeries: signupWindow,
  };
}

export async function getReportQueue(status?: string) {
  const reports = await db.report.findMany({
    where: status ? { status: status as "PENDING" | "REVIEWING" | "RESOLVED" | "DISMISSED" } : {},
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 50,
    include: {
      reporter: { select: authorSelect },
      reviewer: { select: authorSelect },
    },
  });

  const enriched = await Promise.all(
    reports.map(async (report) => {
      let target: { label: string; link: string | null; excerpt: string } = {
        label: report.targetType,
        link: null,
        excerpt: "Target no longer available.",
      };
      try {
        if (report.targetType === "POST") {
          const post = await db.post.findUnique({
            where: { id: report.targetId },
            include: { author: { select: authorSelect } },
          });
          if (post) {
            target = {
              label: `Post by ${post.author.username}`,
              link: `/p/${post.id}`,
              excerpt: post.body.slice(0, 240),
            };
          }
        } else if (report.targetType === "COMMENT") {
          const comment = await db.comment.findUnique({
            where: { id: report.targetId },
            include: { author: { select: authorSelect } },
          });
          if (comment) {
            target = {
              label: `Comment by ${comment.author.username}`,
              link: `/p/${comment.postId}`,
              excerpt: comment.body.slice(0, 240),
            };
          }
        } else if (report.targetType === "USER") {
          const user = await db.user.findUnique({ where: { id: report.targetId }, select: authorSelect });
          if (user) {
            target = { label: `User @${user.username}`, link: `/profile/${user.username}`, excerpt: mapAuthor(user).displayName };
          }
        } else if (report.targetType === "COMMUNITY") {
          const community = await db.community.findUnique({ where: { id: report.targetId } });
          if (community) {
            target = {
              label: `Community ${community.name}`,
              link: `/communities/${community.slug}`,
              excerpt: community.description.slice(0, 240),
            };
          }
        }
      } catch {
        /* invalid target id */
      }
      return {
        id: report.id,
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        details: report.details,
        status: report.status,
        resolutionNote: report.resolutionNote,
        createdAt: report.createdAt.toISOString(),
        reporter: mapAuthor(report.reporter),
        reviewer: report.reviewer ? mapAuthor(report.reviewer) : null,
        target,
      };
    })
  );
  return enriched;
}
