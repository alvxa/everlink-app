import { z } from "zod";
import {
  ALLOWED_FILE_TYPES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  INTERESTS,
  LANGUAGES,
  MAX_BIO_LENGTH,
  MAX_COMMENT_LENGTH,
  MAX_MESSAGE_LENGTH,
  MAX_POST_LENGTH,
  MIN_AGE,
  REACTIONS,
  REPORT_REASONS,
  REPORT_TARGETS,
} from "./constants";
import { ageFromDob } from "./utils";

const languageCodes = LANGUAGES.map((l) => l.code) as [string, ...string[]];
const interests = INTERESTS as unknown as [string, ...string[]];

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(24, "Username must be 24 characters or fewer.")
  .regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers and underscores only.")
  .transform((v) => v.toLowerCase());

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(128, "Password must be 128 characters or fewer.")
  .regex(/[a-zA-Z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

const emailSchema = z.string().trim().email("Enter a valid email address.").max(254).transform((v) => v.toLowerCase());

export const registerSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().min(2, "Display name is required.").max(50),
  email: emailSchema,
  password: passwordSchema,
  dateOfBirth: z
    .string()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Enter a valid date of birth.")
    .refine((v) => ageFromDob(v) >= MIN_AGE, `You must be at least ${MIN_AGE} years old to join Everlink.`)
    .refine((v) => ageFromDob(v) <= 120, "Enter a valid date of birth."),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Accept the Terms and Privacy Policy to continue." }) }),
});

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required."),
  password: z.string().min(1, "Password is required."),
});

export const emailCodeRequestSchema = z.object({ email: emailSchema });

export const emailCodeVerifySchema = z.object({
  email: emailSchema,
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

export const verifyEmailSchema = z.object({ token: z.string().min(10) });

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});

export const twoFactorCodeSchema = z.object({ code: z.string().trim().min(6).max(12) });

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url("Invalid push endpoint.").max(2000),
  keys: z.object({
    p256dh: z.string().min(20).max(300),
    auth: z.string().min(8).max(300),
  }),
  userAgent: z.string().max(300).optional(),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url("Invalid push endpoint.").max(2000),
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(50),
  bio: z.string().trim().max(MAX_BIO_LENGTH).default(""),
  avatarUrl: z.string().max(500).nullable().optional(),
  coverUrl: z.string().max(500).nullable().optional(),
  countryCode: z.string().trim().length(2).toUpperCase().nullable().optional(),
  website: z.string().trim().url("Enter a valid URL.").max(200).nullable().optional().or(z.literal("").transform(() => null)),
  pronouns: z.string().trim().max(30).nullable().optional(),
});

export const settingsSchema = z.object({
  theme: z.enum(["system", "light", "dark"]).optional(),
  language: z.enum(languageCodes).optional(),
  discoverable: z.boolean().optional(),
  showCountry: z.boolean().optional(),
  showOnlineStatus: z.boolean().optional(),
  allowRandomConnect: z.boolean().optional(),
  allowGroupInvites: z.boolean().optional(),
  messagePrivacy: z.enum(["EVERYONE", "FRIENDS"]).optional(),
  connectTopics: z.array(z.enum(interests)).max(10).optional(),
  connectLanguage: z.enum(languageCodes).nullable().optional(),
  emailNotifications: z.boolean().optional(),
  notifyFollows: z.boolean().optional(),
  notifyLikes: z.boolean().optional(),
  notifyComments: z.boolean().optional(),
  notifyMessages: z.boolean().optional(),
  notifyCommunities: z.boolean().optional(),
  notifyLive: z.boolean().optional(),
});

export const onboardingSchema = z.object({
  displayName: z.string().trim().min(2).max(50),
  bio: z.string().trim().max(MAX_BIO_LENGTH).default(""),
  avatarUrl: z.string().max(500).nullable().optional(),
  countryCode: z.string().trim().length(2).toUpperCase().nullable().optional(),
  interests: z.array(z.enum(interests)).min(1, "Pick at least one interest.").max(15),
  languages: z.array(z.enum(languageCodes)).min(1, "Pick at least one language.").max(10),
  discoverable: z.boolean().default(true),
  showCountry: z.boolean().default(true),
});

export const mediaSchema = z.object({
  url: z.string().min(1),
  mime: z.string().min(3),
  type: z.enum(["image", "video"]),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  alt: z.string().max(300).optional(),
});

export const postSchema = z
  .object({
    body: z.string().max(MAX_POST_LENGTH, `Posts are limited to ${MAX_POST_LENGTH} characters.`).default(""),
    type: z.enum(["TEXT", "IMAGE", "VIDEO", "LINK", "POLL"]).optional(),
    visibility: z.enum(["PUBLIC", "FOLLOWERS", "COMMUNITY"]).default("PUBLIC"),
    communityId: z.string().nullable().optional(),
    countryCode: z.string().trim().length(2).toUpperCase().nullable().optional(),
    linkUrl: z
      .string()
      .trim()
      .url("Enter a valid link.")
      .max(2000)
      .refine((v) => /^https?:\/\//i.test(v), "Only http(s) links are allowed.")
      .nullable()
      .optional(),
    media: z.array(mediaSchema).max(10).default([]),
    pollOptions: z.array(z.string().trim().min(1).max(100)).min(2).max(6).optional(),
    authorCountry: z.boolean().optional(),
  })
  .refine((v) => v.body.trim().length > 0 || v.media.length > 0 || !!v.linkUrl || !!v.pollOptions, {
    message: "Write something, add media, a link or a poll.",
    path: ["body"],
  });

export const postUpdateSchema = z.object({
  body: z.string().max(MAX_POST_LENGTH).optional(),
  visibility: z.enum(["PUBLIC", "FOLLOWERS", "COMMUNITY"]).optional(),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty.").max(MAX_COMMENT_LENGTH),
  parentId: z.string().nullable().optional(),
});

export const reactionSchema = z.object({
  targetType: z.enum(["POST", "COMMENT"]),
  targetId: z.string().min(1),
  type: z.enum(REACTIONS.map((r) => r.type) as [string, ...string[]]),
});

export const conversationSchema = z.object({
  type: z.enum(["DIRECT", "GROUP"]).default("DIRECT"),
  memberIds: z.array(z.string()).max(50).default([]),
  usernames: z.array(usernameSchema).max(50).default([]),
  title: z.string().trim().max(80).optional(),
});

export const messageSchema = z
  .object({
    body: z.string().trim().max(MAX_MESSAGE_LENGTH).default(""),
    replyToId: z.string().nullable().optional(),
    attachments: z
      .array(
        z.object({
          url: z.string().min(1),
          kind: z.enum(["image", "video", "audio", "file"]),
          mime: z.string().min(3),
          size: z.number().int().positive(),
          name: z.string().max(255).optional(),
          duration: z.number().int().positive().optional(),
        })
      )
      .max(5)
      .default([]),
  })
  .refine((v) => v.body.length > 0 || v.attachments.length > 0, { message: "Message cannot be empty." });

export const communitySchema = z.object({
  name: z.string().trim().min(3).max(60),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{3,48}$/)
    .optional(),
  description: z.string().trim().min(10, "Add a short description.").max(2000),
  type: z.enum(["PUBLIC", "PRIVATE", "RESTRICTED"]).default("PUBLIC"),
  countryCode: z.string().trim().length(2).toUpperCase().nullable().optional(),
  language: z.enum(languageCodes).default("en"),
  imageUrl: z.string().max(500).nullable().optional(),
  coverUrl: z.string().max(500).nullable().optional(),
  guidelines: z.string().max(5000).default(""),
});

export const communityEventSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).default(""),
  startsAt: z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), "Enter a valid start time."),
  endsAt: z.string().optional().nullable(),
  locationText: z.string().max(160).optional().nullable(),
  onlineUrl: z.string().url().max(500).optional().nullable(),
});

export const storySchema = z
  .object({
    type: z.enum(["IMAGE", "VIDEO", "TEXT"]),
    mediaUrl: z.string().max(500).nullable().optional(),
    body: z.string().trim().max(500).default(""),
    background: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#8057E8"),
    audience: z.enum(["PUBLIC", "FOLLOWERS", "CLOSE_FRIENDS"]).default("PUBLIC"),
  })
  .refine((v) => (v.type === "TEXT" ? v.body.length > 0 : !!v.mediaUrl), {
    message: "Add the content for your moment.",
  });

export const liveRoomSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().max(1000).default(""),
  type: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
  topic: z.string().trim().max(60).optional().nullable(),
  countryCode: z.string().trim().length(2).toUpperCase().nullable().optional(),
  communityId: z.string().optional().nullable(),
});

export const reportSchema = z.object({
  targetType: z.enum(REPORT_TARGETS as unknown as [string, ...string[]]),
  targetId: z.string().min(1),
  reason: z.enum(REPORT_REASONS as unknown as [string, ...string[]]),
  details: z.string().trim().max(2000).default(""),
});

export const connectPreferencesSchema = z.object({
  topics: z.array(z.enum(interests)).max(10).default([]),
  language: z.enum(languageCodes).nullable().optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  subject: z.string().trim().min(3).max(120),
  body: z.string().trim().min(10).max(5000),
});

export const translateSchema = z.object({
  text: z.string().trim().min(1).max(5000),
  targetLang: z.string().trim().min(2).max(8).regex(/^[a-zA-Z-]+$/),
  sourceType: z.enum(["POST", "COMMENT", "MESSAGE", "STORY"]).optional(),
  sourceId: z.string().optional(),
});

export const adminUserActionSchema = z.object({
  action: z.enum(["SUSPEND", "RESTORE", "MAKE_MODERATOR", "MAKE_USER", "MAKE_ADMIN", "VERIFY"]),
  reason: z.string().trim().max(500).default(""),
});

export const adminReportActionSchema = z.object({
  action: z.enum(["REVIEWING", "RESOLVE", "DISMISS"]),
  note: z.string().trim().max(1000).default(""),
  removeContent: z.boolean().default(false),
  suspendTarget: z.boolean().default(false),
  warnAuthor: z.boolean().default(false),
});

export const adminSettingsSchema = z.object({
  registrationOpen: z.enum(["true", "false"]).optional(),
});

export const adminCommunityActionSchema = z.object({
  action: z.enum(["SUSPEND", "RESTORE"]),
  reason: z.string().trim().max(500).default(""),
});

export const fileKinds = ["AVATAR", "COVER", "POST", "STORY", "MESSAGE"] as const;
export const uploadSchema = z.object({
  kind: z.enum(fileKinds),
});

export const allowedMimeByKind: Record<string, string[]> = {
  AVATAR: ALLOWED_IMAGE_TYPES,
  COVER: ALLOWED_IMAGE_TYPES,
  POST: [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES],
  STORY: [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES],
  MESSAGE: [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_FILE_TYPES, "audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4"],
};
