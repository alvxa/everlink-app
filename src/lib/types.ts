// Shared DTO shapes passed from server components to client components and
// returned by the REST API. Keep these free of Prisma types so they serialize.

export type AuthorDTO = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  verified: boolean;
  countryCode: string | null;
};

export type MediaDTO = {
  id: string;
  url: string;
  mime: string;
  type: string;
  alt: string | null;
  width: number | null;
  height: number | null;
};

export type CommunityRefDTO = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
};

export type PollDTO = {
  options: { id: string; text: string; votes: number }[];
  totalVotes: number;
  viewerOptionId: string | null;
};

export type FeedPostDTO = {
  id: string;
  type: string;
  body: string;
  linkUrl: string | null;
  visibility: string;
  countryCode: string | null;
  createdAt: string;
  editedAt: string | null;
  author: AuthorDTO;
  community: CommunityRefDTO | null;
  media: MediaDTO[];
  hashtags: string[];
  counts: { comments: number; reactions: number; reposts: number };
  viewerReaction: string | null;
  viewerBookmarked: boolean;
  poll: PollDTO | null;
  repostOf: {
    id: string;
    body: string;
    type: string;
    createdAt: string;
    author: AuthorDTO;
    media: MediaDTO[];
    community: CommunityRefDTO | null;
  } | null;
};

export type CommentDTO = {
  id: string;
  body: string;
  createdAt: string;
  parentId: string | null;
  author: AuthorDTO;
  viewerReaction: string | null;
  replies: CommentDTO[];
};

export type StoryDTO = {
  id: string;
  type: string;
  mediaUrl: string | null;
  body: string;
  background: string;
  audience: string;
  createdAt: string;
  expiresAt: string;
  author: AuthorDTO;
  viewed: boolean;
  reactionCount: number;
  viewCount: number;
};

export type CommunityDTO = {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: string;
  imageUrl: string | null;
  coverUrl: string | null;
  countryCode: string | null;
  language: string;
  memberCount: number;
  viewerRole: string | null;
};

export type NotificationDTO = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
  actor: AuthorDTO | null;
};

export type MessageAttachmentDTO = {
  id: string;
  url: string;
  kind: string;
  mime: string;
  size: number;
  name: string | null;
  duration: number | null;
};

export type MessageDTO = {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  sender: AuthorDTO;
  attachments: MessageAttachmentDTO[];
  replyTo: { id: string; body: string; senderName: string } | null;
};

export type ConversationSummaryDTO = {
  id: string;
  type: string;
  title: string;
  imageUrl: string | null;
  members: AuthorDTO[];
  otherUser: AuthorDTO | null;
  lastMessage: {
    id: string;
    body: string;
    createdAt: string;
    senderId: string;
    senderName: string;
  } | null;
  lastMessageAt: string;
  unread: number;
  muted: boolean;
  archived: boolean;
};

export type ConversationDetailDTO = {
  id: string;
  type: string;
  title: string;
  members: AuthorDTO[];
  otherUser: AuthorDTO | null;
};
