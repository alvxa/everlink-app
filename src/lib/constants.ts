export const APP_NAME = "Everlink";
export const APP_TAGLINE = "Connect Beyond Boundaries.";
export const APP_DESCRIPTION =
  "Everlink is a global social network for meeting people, sharing moments and exploring cultures across borders.";

export const MIN_AGE = 13;
export const ADULT_AGE = 18;

export const INTERESTS = [
  "Travel",
  "Music",
  "Technology",
  "Gaming",
  "Film & TV",
  "Books",
  "Art",
  "Photography",
  "Food",
  "Sports",
  "Fitness",
  "Fashion",
  "Nature",
  "Science",
  "Languages",
  "Culture",
  "History",
  "Dance",
  "Design",
  "Startups",
  "Anime",
  "Pets",
  "Cooking",
  "Volunteering",
] as const;

export const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "fr", label: "French", native: "Français" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "it", label: "Italian", native: "Italiano" },
  { code: "nl", label: "Dutch", native: "Nederlands" },
  { code: "sv", label: "Swedish", native: "Svenska" },
  { code: "no", label: "Norwegian", native: "Norsk" },
  { code: "da", label: "Danish", native: "Dansk" },
  { code: "fi", label: "Finnish", native: "Suomi" },
  { code: "pl", label: "Polish", native: "Polski" },
  { code: "cs", label: "Czech", native: "Čeština" },
  { code: "ro", label: "Romanian", native: "Română" },
  { code: "tr", label: "Turkish", native: "Türkçe" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "uk", label: "Ukrainian", native: "Українська" },
  { code: "ar", label: "Arabic", native: "العربية" },
  { code: "he", label: "Hebrew", native: "עברית" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "ur", label: "Urdu", native: "اردو" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia" },
  { code: "ms", label: "Malay", native: "Bahasa Melayu" },
  { code: "th", label: "Thai", native: "ไทย" },
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt" },
  { code: "tl", label: "Filipino", native: "Filipino" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "sw", label: "Swahili", native: "Kiswahili" },
  { code: "am", label: "Amharic", native: "አማርኛ" },
  { code: "ha", label: "Hausa", native: "Hausa" },
  { code: "yo", label: "Yoruba", native: "Yorùbá" },
  { code: "ig", label: "Igbo", native: "Igbo" },
  { code: "zu", label: "Zulu", native: "isiZulu" },
  { code: "el", label: "Greek", native: "Ελληνικά" },
  { code: "hu", label: "Hungarian", native: "Magyar" },
  { code: "fa", label: "Persian", native: "فارسی" },
] as const;

export const LANGUAGE_MAP = new Map(LANGUAGES.map((l) => [l.code, l]));

export const REACTIONS: { type: string; emoji: string; label: string }[] = [
  { type: "LIKE", emoji: "👍", label: "Like" },
  { type: "LOVE", emoji: "❤️", label: "Love" },
  { type: "HAHA", emoji: "😂", label: "Haha" },
  { type: "WOW", emoji: "😮", label: "Wow" },
  { type: "SAD", emoji: "😢", label: "Sad" },
  { type: "ANGRY", emoji: "😡", label: "Angry" },
];

export const REACTION_EMOJI = new Map(REACTIONS.map((r) => [r.type, r.emoji]));

export const REPORT_REASONS = [
  "Spam or misleading content",
  "Harassment or bullying",
  "Hate speech",
  "Violence or dangerous content",
  "Sexual or inappropriate content",
  "Child safety concern",
  "Impersonation",
  "Scam or fraud",
  "Self-harm concern",
  "Privacy violation",
  "Other",
] as const;

export const REPORT_TARGETS = [
  "POST",
  "COMMENT",
  "USER",
  "COMMUNITY",
  "MESSAGE",
  "STORY",
  "LIVE_ROOM",
  "EVENT",
] as const;

export const MAX_POST_LENGTH = 5000;
export const MAX_COMMENT_LENGTH = 2000;
export const MAX_MESSAGE_LENGTH = 5000;
export const MAX_BIO_LENGTH = 300;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const ALLOWED_AUDIO_TYPES = ["audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4"];
export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const UPLOAD_LIMITS = {
  image: 10 * 1024 * 1024,
  video: 60 * 1024 * 1024,
  audio: 15 * 1024 * 1024,
  file: 15 * 1024 * 1024,
};

export const NOTIFICATION_PREF_MAP = {
  FOLLOW: "notifyFollows",
  FRIEND_REQUEST: "notifyFollows",
  FRIEND_ACCEPT: "notifyFollows",
  POST_LIKE: "notifyLikes",
  POST_COMMENT: "notifyComments",
  COMMENT_REPLY: "notifyComments",
  MENTION: "notifyComments",
  MESSAGE: "notifyMessages",
  COMMUNITY_INVITE: "notifyCommunities",
  LIVE_INVITE: "notifyLive",
} as const;

export const FEED_PAGE_SIZE = 10;
export const MESSAGE_PAGE_SIZE = 30;
export const NOTIFICATION_PAGE_SIZE = 20;

export const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;

export const SITE_ROLES = ["USER", "MODERATOR", "ADMIN"] as const;
