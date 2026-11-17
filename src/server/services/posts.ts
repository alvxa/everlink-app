import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ApiError, badRequest, conflict, forbidden, notFound } from "@/lib/api";
import { assertUploadOwnership } from "@/lib/storage";
import { extractHashtags, extractMentions } from "@/lib/utils";
import { createNotification, removeNotificationByDedupe } from "@/lib/notifications";
import { getPostById, getComments, mapAuthor, authorSelect } from "@/lib/queries";
import type { CommentDTO, FeedPostDTO } from "@/lib/types";
import { isStaff, type SessionUser } from "@/lib/auth";
import { postSchema, postUpdateSchema, commentSchema, reactionSchema } from "@/lib/validation";
import { z } from "zod";

type CreatePostInput = z.infer<typeof postSchema>;

export async function assertCanViewPost(postId: string, user: SessionUser) {
  const post = await db.post.findFirst({
    where: { id: postId, deletedAt: null },
    select: {
      id: true,
      visibility: true,
      authorId: true,
      communityId: true,
      author: { select: { username: true } },
    },
  });
  if (!post) throw notFound("That post no longer exists.");
  if (post.visibility === "FOLLOWERS" && post.authorId !== user.id) {
    const follows = await db.follow.findUnique({
      where: { followerId_followingId: { followerId: user.id, followingId: post.authorId } },
    });
    if (!follows) throw forbidden("This post is only visible to followers.");
  }
  if (post.visibility === "COMMUNITY" && post.communityId && post.authorId !== user.id && !isStaff(user)) {
    const membership = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: post.communityId, userId: user.id } },
    });
    if (!membership) throw forbidden("Join this community to see its posts.");
  }
  return post;
}

export async function createPost(user: SessionUser, input: CreatePostInput): Promise<FeedPostDTO> {
  if (input.type === "POLL" && (!input.pollOptions || input.pollOptions.length < 2)) {
    throw badRequest("Add at least two poll options.");
  }
  if (input.type === "LINK" && !input.linkUrl) throw badRequest("Add a link to share.");

  let communityId: string | null = null;
  if (input.communityId) {
    const membership = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: input.communityId, userId: user.id } },
      include: { community: { select: { suspendedAt: true, type: true } } },
    });
    if (!membership) throw forbidden("You must be a member of that community to post there.");
    if (membership.community.suspendedAt) throw forbidden("This community is currently suspended.");
    communityId = input.communityId;
  }

  const mediaUrls = input.media.map((m) => m.url);
  await assertUploadOwnership(user.id, mediaUrls, "POST");

  const hashtags = extractHashtags(input.body);
  const mentions = extractMentions(input.body);
  const countryCode = input.authorCountry ? user.profile?.countryCode ?? null : input.countryCode ?? null;

  const post = await db.$transaction(async (tx) => {
    const created = await tx.post.create({
      data: {
        authorId: user.id,
        body: input.body.trim(),
        type: input.type ?? (input.media.length ? "IMAGE" : input.linkUrl ? "LINK" : input.pollOptions ? "POLL" : "TEXT"),
        visibility: communityId ? "COMMUNITY" : input.visibility,
        communityId,
        countryCode: countryCode?.toUpperCase() ?? null,
        linkUrl: input.linkUrl ?? null,
        media: {
          create: input.media.map((m, index) => ({
            url: m.url,
            mime: m.mime,
            type: m.type,
            width: m.width ?? null,
            height: m.height ?? null,
            alt: m.alt ?? null,
            position: index,
          })),
        },
        pollOptions: input.pollOptions ? { create: input.pollOptions.map((text, i) => ({ text, position: i })) } : undefined,
      },
    });

    for (const tag of hashtags) {
      const hashtag = await tx.hashtag.upsert({
        where: { tag },
        create: { tag, count: 1 },
        update: { count: { increment: 1 } },
      });
      await tx.postHashtag.create({ data: { postId: created.id, hashtagId: hashtag.id } }).catch(() => {});
    }
    return created;
  });

  if (mentions.length) {
    const recipients = await db.user.findMany({
      where: { username: { in: mentions }, id: { not: user.id }, status: "ACTIVE" },
      select: { id: true },
    });
    for (const recipient of recipients) {
      await createNotification({
        userId: recipient.id,
        type: "MENTION",
        actorId: user.id,
        title: `${user.profile?.displayName || user.username} mentioned you in a post`,
        body: input.body.slice(0, 120),
        link: `/p/${post.id}`,
        entityType: "POST",
        entityId: post.id,
        dedupeKey: `mention:post:${post.id}:${recipient.id}`,
      });
    }
  }

  const dto = await getPostById(post.id, user.id);
  if (!dto) throw new ApiError(500, "POST_LOAD_FAILED", "The post was saved but could not be loaded.");
  return dto;
}

export async function updatePost(user: SessionUser, postId: string, input: z.infer<typeof postUpdateSchema>) {
  const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true, deletedAt: true, body: true } });
  if (!post || post.deletedAt) throw notFound("That post no longer exists.");
  if (post.authorId !== user.id) throw forbidden("You can only edit your own posts.");

  if (input.body !== undefined && input.body !== post.body) {
    const oldTags = extractHashtags(post.body);
    const newTags = extractHashtags(input.body);
    await db.$transaction(async (tx) => {
      await tx.postHashtag.deleteMany({ where: { postId } });
      for (const tag of newTags) {
        const hashtag = await tx.hashtag.upsert({
          where: { tag },
          create: { tag, count: 1 },
          update: { count: { increment: 1 } },
        });
        await tx.postHashtag.create({ data: { postId, hashtagId: hashtag.id } }).catch(() => {});
      }
      for (const tag of oldTags.filter((t) => !newTags.includes(t))) {
        await tx.hashtag.updateMany({ where: { tag, count: { gt: 0 } }, data: { count: { decrement: 1 } } });
      }
      await tx.post.update({
        where: { id: postId },
        data: { body: input.body!.trim(), visibility: input.visibility ?? undefined, editedAt: new Date() },
      });
    });
  } else {
    await db.post.update({
      where: { id: postId },
      data: { visibility: input.visibility ?? undefined, editedAt: new Date() },
    });
  }

  const dto = await getPostById(postId, user.id);
  if (!dto) throw notFound();
  return dto;
}

export async function removePost(user: SessionUser, postId: string) {
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { authorId: true, body: true, deletedAt: true, author: { select: authorSelect } },
  });
  if (!post || post.deletedAt) throw notFound("That post no longer exists.");
  const staff = isStaff(user);
  if (post.authorId !== user.id && !staff) throw forbidden("You can only delete your own posts.");

  await db.$transaction(async (tx) => {
    await tx.post.update({ where: { id: postId }, data: { deletedAt: new Date() } });
    for (const tag of extractHashtags(post.body)) {
      await tx.hashtag.updateMany({ where: { tag, count: { gt: 0 } }, data: { count: { decrement: 1 } } });
    }
    if (staff && post.authorId !== user.id) {
      await tx.moderationAction.create({
        data: {
          moderatorId: user.id,
          targetUserId: post.authorId,
          targetType: "POST",
          targetId: postId,
          action: "REMOVE_CONTENT",
          note: "Removed by staff from the post menu.",
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "moderation.post.remove",
          targetType: "POST",
          targetId: postId,
          metadata: { authorId: post.authorId },
        },
      });
    }
  });
  await createNotification({
    userId: post.authorId,
    type: "SYSTEM",
    actorId: staff && post.authorId !== user.id ? user.id : null,
    title: staff && post.authorId !== user.id ? "A post was removed by moderators" : "Your post was deleted",
    body: post.body.slice(0, 120),
    link: "/settings?tab=content",
    dedupeKey: `post-remove:${postId}`,
  });
}

export async function toggleReaction(user: SessionUser, targetType: "POST" | "COMMENT", targetId: string, type: string) {
  if (targetType === "POST") {
    const post = await db.post.findFirst({
      where: { id: targetId, deletedAt: null },
      select: { id: true, authorId: true, body: true },
    });
    if (!post) throw notFound("That post no longer exists.");
    await assertCanViewPost(targetId, user);

    const existing = await db.reaction.findUnique({
      where: { userId_postId: { userId: user.id, postId: targetId } },
    });
    if (existing && existing.type === type) {
      await db.reaction.delete({ where: { id: existing.id } });
      await removeNotificationByDedupe(post.authorId, `reaction:post:${targetId}:${user.id}`);
      return { reacted: false, type: null };
    }
    await db.reaction.upsert({
      where: { userId_postId: { userId: user.id, postId: targetId } },
      create: { userId: user.id, postId: targetId, type: type as Prisma.ReactionCreateInput["type"] },
      update: { type: type as Prisma.ReactionCreateInput["type"] },
    });
    await createNotification({
      userId: post.authorId,
      type: "POST_LIKE",
      actorId: user.id,
      title: `${user.profile?.displayName || user.username} reacted to your post`,
      body: post.body.slice(0, 120),
      link: `/p/${targetId}`,
      entityType: "POST",
      entityId: targetId,
      dedupeKey: `reaction:post:${targetId}:${user.id}`,
    });
    return { reacted: true, type };
  }

  const comment = await db.comment.findFirst({
    where: { id: targetId, deletedAt: null },
    select: { id: true, authorId: true, body: true, postId: true },
  });
  if (!comment) throw notFound("That comment no longer exists.");
  const existing = await db.reaction.findUnique({
    where: { userId_commentId: { userId: user.id, commentId: targetId } },
  });
  if (existing && existing.type === type) {
    await db.reaction.delete({ where: { id: existing.id } });
    await removeNotificationByDedupe(comment.authorId, `reaction:comment:${targetId}:${user.id}`);
    return { reacted: false, type: null };
  }
  await db.reaction.upsert({
    where: { userId_commentId: { userId: user.id, commentId: targetId } },
    create: { userId: user.id, commentId: targetId, type: type as Prisma.ReactionCreateInput["type"] },
    update: { type: type as Prisma.ReactionCreateInput["type"] },
  });
  await createNotification({
    userId: comment.authorId,
    type: "POST_LIKE",
    actorId: user.id,
    title: `${user.profile?.displayName || user.username} reacted to your comment`,
    body: comment.body.slice(0, 120),
    link: `/p/${comment.postId}`,
    entityType: "COMMENT",
    entityId: targetId,
    dedupeKey: `reaction:comment:${targetId}:${user.id}`,
  });
  return { reacted: true, type };
}

export async function toggleBookmark(user: SessionUser, postId: string) {
  const post = await db.post.findFirst({ where: { id: postId, deletedAt: null }, select: { id: true } });
  if (!post) throw notFound("That post no longer exists.");
  const existing = await db.bookmark.findUnique({ where: { userId_postId: { userId: user.id, postId } } });
  if (existing) {
    await db.bookmark.delete({ where: { userId_postId: { userId: user.id, postId } } });
    return { bookmarked: false };
  }
  await db.bookmark.create({ data: { userId: user.id, postId } });
  return { bookmarked: true };
}

export async function repost(user: SessionUser, postId: string) {
  if (!(await getPostById(postId, user.id))) throw notFound("That post is not available to repost.");
  const existing = await db.post.findFirst({
    where: { authorId: user.id, repostOfId: postId, deletedAt: null },
    select: { id: true },
  });
  if (existing) throw conflict("You already reposted this.");
  const created = await db.post.create({
    data: {
      authorId: user.id,
      type: "REPOST",
      repostOfId: postId,
      visibility: "PUBLIC",
    },
    select: { id: true, repostOf: { select: { authorId: true, body: true } } },
  });
  if (created.repostOf) {
    await createNotification({
      userId: created.repostOf.authorId,
      type: "SYSTEM",
      actorId: user.id,
      title: `${user.profile?.displayName || user.username} reposted your post`,
      body: created.repostOf.body.slice(0, 120),
      link: `/p/${postId}`,
      entityType: "POST",
      entityId: postId,
      dedupeKey: `repost:${postId}:${user.id}`,
    });
  }
  const dto = await getPostById(created.id, user.id);
  if (!dto) throw notFound();
  return dto;
}

export async function votePoll(user: SessionUser, postId: string, optionId: string) {
  const option = await db.pollOption.findFirst({
    where: { id: optionId, postId },
    select: { id: true, post: { select: { id: true, type: true, deletedAt: true } } },
  });
  if (!option || option.post.deletedAt) throw notFound("That poll option no longer exists.");
  await assertCanViewPost(postId, user);

  const existing = await db.pollVote.findFirst({
    where: { userId: user.id, option: { postId } },
    select: { id: true },
  });
  await db.$transaction(async (tx) => {
    if (existing) await tx.pollVote.delete({ where: { id: existing.id } });
    await tx.pollVote.create({ data: { optionId, userId: user.id } });
  });

  const dto = await getPostById(postId, user.id);
  if (!dto) throw notFound();
  return dto;
}

export async function createComment(user: SessionUser, postId: string, input: z.infer<typeof commentSchema>): Promise<CommentDTO> {
  const post = await db.post.findFirst({
    where: { id: postId, deletedAt: null },
    select: { id: true, authorId: true, body: true },
  });
  if (!post) throw notFound("That post no longer exists.");
  await assertCanViewPost(postId, user);

  let parent: { id: string; authorId: string; body: string } | null = null;
  if (input.parentId) {
    parent = await db.comment.findFirst({
      where: { id: input.parentId, postId, deletedAt: null },
      select: { id: true, authorId: true, body: true },
    });
    if (!parent) throw badRequest("The comment you are replying to no longer exists.");
  }

  const comment = await db.comment.create({
    data: { postId, authorId: user.id, body: input.body.trim(), parentId: parent?.id ?? null },
    include: { author: { select: authorSelect } },
  });

  if (parent && parent.authorId !== user.id) {
    await createNotification({
      userId: parent.authorId,
      type: "COMMENT_REPLY",
      actorId: user.id,
      title: `${user.profile?.displayName || user.username} replied to your comment`,
      body: input.body.slice(0, 120),
      link: `/p/${postId}`,
      entityType: "COMMENT",
      entityId: comment.id,
      dedupeKey: `reply:${comment.id}`,
    });
  }
  if (post.authorId !== user.id && post.authorId !== parent?.authorId) {
    await createNotification({
      userId: post.authorId,
      type: "POST_COMMENT",
      actorId: user.id,
      title: `${user.profile?.displayName || user.username} commented on your post`,
      body: input.body.slice(0, 120),
      link: `/p/${postId}`,
      entityType: "POST",
      entityId: postId,
      dedupeKey: `comment:${comment.id}`,
    });
  }

  for (const username of extractMentions(input.body)) {
    const mentioned = await db.user.findUnique({ where: { username }, select: { id: true } });
    if (!mentioned || mentioned.id === user.id) continue;
    await createNotification({
      userId: mentioned.id,
      type: "MENTION",
      actorId: user.id,
      title: `${user.profile?.displayName || user.username} mentioned you in a comment`,
      body: input.body.slice(0, 120),
      link: `/p/${postId}`,
      entityType: "COMMENT",
      entityId: comment.id,
      dedupeKey: `mention:comment:${comment.id}:${mentioned.id}`,
    });
  }

  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    parentId: comment.parentId,
    author: mapAuthor(comment.author),
    viewerReaction: null,
    replies: [],
  };
}

export async function removeComment(user: SessionUser, commentId: string) {
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, deletedAt: true, postId: true, body: true },
  });
  if (!comment || comment.deletedAt) throw notFound("That comment no longer exists.");
  if (comment.authorId !== user.id && !isStaff(user)) throw forbidden("You can only delete your own comments.");
  await db.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
  if (isStaff(user) && comment.authorId !== user.id) {
    await db.moderationAction.create({
      data: {
        moderatorId: user.id,
        targetUserId: comment.authorId,
        targetType: "COMMENT",
        targetId: commentId,
        action: "REMOVE_CONTENT",
        note: "Removed by staff.",
      },
    });
  }
}

export async function getPostComments(postId: string, user: SessionUser) {
  await assertCanViewPost(postId, user);
  return getComments(postId, user.id);
}
