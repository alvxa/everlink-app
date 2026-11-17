/**
 * DEVELOPMENT / DEMO SEED — never run this against production data.
 * Creates clearly labeled demo accounts (@everlink.demo), communities, posts,
 * conversations and moderation records so the UI and admin tools can be tested.
 *
 *   npm run db:seed
 *
 * Demo credentials (development only):
 *   admin@everlink.demo / AdminPass123!   (ADMIN)
 *   moderator@everlink.demo / ModPass123! (MODERATOR)
 *   aiko@everlink.demo / DemoPass123!     (USER)
 *   ...and other @everlink.demo members with DemoPass123!
 */
import { PrismaClient, type NotificationType, type Prisma } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const db = new PrismaClient();
const STORAGE = path.join(process.cwd(), "storage", "uploads", "public", "demo");

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000);
const daysFromNow = (d: number) => new Date(now + d * 24 * 60 * 60 * 1000);
const hoursFromNow = (h: number) => new Date(now + h * 60 * 60 * 1000);

const PALETTES = [
  ["#8057E8", "#2799E8"],
  ["#2799E8", "#19BFA5"],
  ["#19BFA5", "#8057E8"],
  ["#F59E0B", "#EF4444"],
  ["#EC4899", "#8057E8"],
  ["#0EA5E9", "#6366F1"],
  ["#14B8A6", "#0EA5E9"],
  ["#F97316", "#EC4899"],
];

function avatarSvg(name: string, index: number) {
  const [a, b] = PALETTES[index % PALETTES.length]!;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
  <rect width="240" height="240" fill="url(#g)"/>
  <circle cx="200" cy="40" r="70" fill="#fff" opacity="0.12"/>
  <circle cx="30" cy="210" r="90" fill="#fff" opacity="0.08"/>
  <text x="120" y="128" font-family="Inter, Arial, sans-serif" font-size="76" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="middle">${initials}</text>
</svg>`;
}

function sceneSvg(label: string, index: number) {
  const [a, b] = PALETTES[(index + 2) % PALETTES.length]!;
  const [c] = PALETTES[(index + 5) % PALETTES.length]!;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
    <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="900" height="600" fill="url(#bg)"/>
  <circle cx="720" cy="120" r="190" fill="#ffffff" opacity="0.10"/>
  <circle cx="150" cy="520" r="240" fill="${c}" opacity="0.28"/>
  <path d="M0 430 C 180 340 300 500 470 420 S 760 330 900 400 L900 600 L0 600 Z" fill="#ffffff" opacity="0.12"/>
  <path d="M0 490 C 200 420 340 540 520 470 S 780 410 900 470" stroke="#ffffff" stroke-opacity="0.45" stroke-width="3" fill="none"/>
  <text x="60" y="96" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="600" fill="#ffffff" opacity="0.85" letter-spacing="6">EVERLINK MOMENTS</text>
  <text x="60" y="170" font-family="Sora, Inter, Arial, sans-serif" font-size="56" font-weight="700" fill="#ffffff">${label}</text>
</svg>`;
}

async function writeDemoImages() {
  await mkdir(path.join(STORAGE, "avatars"), { recursive: true });
  await mkdir(path.join(STORAGE, "posts"), { recursive: true });
  await mkdir(path.join(STORAGE, "moments"), { recursive: true });
  const avatars = ["Aiko Tanaka", "Maya Ferreira", "Luca Moretti", "Amara Okafor", "Sofía Ramírez", "Kenji Watanabe", "Noor El Amrani", "Priya Nair", "Elena Fischer", "Mateo Cruz", "Zara Khan", "Léo Dubois", "Sana Mwangi", "Dana Whitfield", "Everlink Admin"];
  await Promise.all(
    avatars.map((name, i) =>
      writeFile(path.join(STORAGE, "avatars", `${slug(name)}.svg`), avatarSvg(name, i)).catch(() => {})
    )
  );
  const scenes = [
    ["Tokyo after rain", 0],
    ["São Paulo sound", 1],
    ["Lagos build night", 2],
    ["Lisbon golden hour", 3],
    ["Marrakech colours", 4],
    ["Nairobi green", 5],
    ["Mexico City table", 6],
    ["Barcelona sketchbook", 7],
  ] as const;
  await Promise.all(
    scenes.map(([label, i]) =>
      writeFile(path.join(STORAGE, "posts", `scene-${i + 1}.svg`), sceneSvg(label, i)).catch(() => {})
    )
  );
  const moments = [
    ["Morning light", 0],
    ["Night market", 1],
    ["Studio day", 2],
    ["Coastline", 3],
  ] as const;
  await Promise.all(
    moments.map(([label, i]) =>
      writeFile(path.join(STORAGE, "moments", `moment-${i + 1}.svg`), sceneSvg(label, i + 3)).catch(() => {})
    )
  );
}

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const avatarUrl = (name: string) => `/api/v1/files/public/demo/avatars/${slug(name)}.svg`;
const sceneUrl = (n: number) => `/api/v1/files/public/demo/posts/scene-${n}.svg`;
const momentUrl = (n: number) => `/api/v1/files/public/demo/moments/moment-${n}.svg`;

type DemoUser = {
  username: string;
  displayName: string;
  email: string;
  password: string;
  role: "USER" | "MODERATOR" | "ADMIN";
  dob: string;
  country: string;
  bio: string;
  interests: string[];
  languages: string[];
  website?: string;
  pronouns?: string;
  verified?: boolean;
};

const USERS: DemoUser[] = [
  {
    username: "admin",
    displayName: "Everlink Admin",
    email: "admin@everlink.demo",
    password: "AdminPass123!",
    role: "ADMIN",
    dob: "1990-05-14",
    country: "PH",
    bio: "Keeping Everlink safe, welcoming and genuinely global. Reach the team any time through Help & Support.",
    interests: ["Technology", "Culture", "Languages", "Travel"],
    languages: ["en", "tl"],
    verified: true,
  },
  {
    username: "moderator",
    displayName: "Dana Whitfield",
    email: "moderator@everlink.demo",
    password: "ModPass123!",
    role: "MODERATOR",
    dob: "1992-03-22",
    country: "GB",
    bio: "Community moderator. Here to help conversations stay kind and on-topic.",
    interests: ["Books", "Culture", "Volunteering"],
    languages: ["en", "fr"],
    verified: true,
  },
  {
    username: "aiko",
    displayName: "Aiko Tanaka",
    email: "aiko@everlink.demo",
    password: "DemoPass123!",
    role: "USER",
    dob: "1999-08-02",
    country: "JP",
    bio: "Manila ↔ Tokyo. Photographer of small streets and big skies. Learning Spanish, teaching Japanese, collecting recipes.",
    interests: ["Photography", "Travel", "Food", "Languages", "Anime"],
    languages: ["ja", "en", "tl"],
    website: "https://example.com/aiko",
    pronouns: "she/her",
  },
  {
    username: "maya",
    displayName: "Maya Ferreira",
    email: "maya@everlink.demo",
    password: "DemoPass123!",
    role: "USER",
    dob: "1998-11-19",
    country: "BR",
    bio: "São Paulo based DJ and music producer. I trade playlists for travel tips.",
    interests: ["Music", "Dance", "Photography", "Travel"],
    languages: ["pt", "en", "es"],
  },
  {
    username: "luca",
    displayName: "Luca Moretti",
    email: "luca@everlink.demo",
    password: "DemoPass123!",
    role: "USER",
    dob: "1996-01-30",
    country: "IT",
    bio: "Product designer in Milan. Espresso, typography and long walks.",
    interests: ["Design", "Food", "Sports", "Photography"],
    languages: ["it", "en"],
  },
  {
    username: "amara",
    displayName: "Amara Okafor",
    email: "amara@everlink.demo",
    password: "DemoPass123!",
    role: "USER",
    dob: "1997-06-11",
    country: "NG",
    bio: "Building tools for African founders from Lagos. Community over competition.",
    interests: ["Technology", "Startups", "Volunteering", "Music"],
    languages: ["en", "ig", "ha"],
  },
  {
    username: "sofia",
    displayName: "Sofía Ramírez",
    email: "sofia@everlink.demo",
    password: "DemoPass123!",
    role: "USER",
    dob: "2000-02-05",
    country: "ES",
    bio: "Barcelona. Language exchange host, sketchbook hoarder, amateur astronomer.",
    interests: ["Languages", "Art", "Travel", "Books"],
    languages: ["es", "en", "fr"],
  },
  {
    username: "kenji",
    displayName: "Kenji Watanabe",
    email: "kenji@everlink.demo",
    password: "DemoPass123!",
    role: "USER",
    dob: "1995-09-27",
    country: "JP",
    bio: "Game developer in Tokyo. Ask me about indie games and ramen geography.",
    interests: ["Gaming", "Anime", "Technology", "Film & TV"],
    languages: ["ja", "en"],
  },
  {
    username: "noor",
    displayName: "Noor El Amrani",
    email: "noor@everlink.demo",
    password: "DemoPass123!",
    role: "USER",
    dob: "1999-04-16",
    country: "MA",
    bio: "Marrakech. Food historian, souk wanderer, tea enthusiast.",
    interests: ["Culture", "History", "Cooking", "Nature"],
    languages: ["ar", "fr", "en"],
  },
  {
    username: "priya",
    displayName: "Priya Nair",
    email: "priya@everlink.demo",
    password: "DemoPass123!",
    role: "USER",
    dob: "1998-07-08",
    country: "IN",
    bio: "Bengaluru. Software engineer, Bharatanatyam student, early morning person.",
    interests: ["Science", "Books", "Fitness", "Dance"],
    languages: ["hi", "en", "ta"],
  },
  {
    username: "elena",
    displayName: "Elena Fischer",
    email: "elena@everlink.demo",
    password: "DemoPass123!",
    role: "USER",
    dob: "1994-12-03",
    country: "DE",
    bio: "Berlin via Lisbon. Remote product lead, weekend trail runner.",
    interests: ["Design", "Startups", "Nature", "Fitness"],
    languages: ["de", "en", "pt"],
  },
  {
    username: "mateo",
    displayName: "Mateo Cruz",
    email: "mateo@everlink.demo",
    password: "DemoPass123!",
    role: "USER",
    dob: "2001-10-21",
    country: "MX",
    bio: "Mexico City. Cooking for friends, collecting vinyl, learning to surf.",
    interests: ["Food", "Music", "Sports", "Travel"],
    languages: ["es", "en"],
  },
  {
    username: "zara",
    displayName: "Zara Khan",
    email: "zara@everlink.demo",
    password: "DemoPass123!",
    role: "USER",
    dob: "1997-03-14",
    country: "PK",
    bio: "Karachi. Illustrator and arts educator. Sketches of people, places and imagined cities.",
    interests: ["Art", "Photography", "Volunteering", "Books"],
    languages: ["ur", "en"],
  },
  {
    username: "leo",
    displayName: "Léo Dubois",
    email: "leo@everlink.demo",
    password: "DemoPass123!",
    role: "USER",
    dob: "1993-08-09",
    country: "FR",
    bio: "Paris. Documentary editor. I will absolutely talk about films for hours.",
    interests: ["Film & TV", "Cooking", "Music", "Travel"],
    languages: ["fr", "en", "es"],
  },
  {
    username: "sana",
    displayName: "Sana Mwangi",
    email: "sana@everlink.demo",
    password: "DemoPass123!",
    role: "USER",
    dob: "2000-05-25",
    country: "KE",
    bio: "Nairobi. Conservation photographer, trail runner, tea with too much ginger.",
    interests: ["Nature", "Photography", "Fitness", "Culture"],
    languages: ["sw", "en"],
  },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run the development seed with NODE_ENV=production.");
  }
  console.log("[seed] preparing demo media");
  await writeDemoImages();

  const demoEmails = USERS.map((u) => u.email);
  const existing = await db.user.findMany({
    where: { email: { in: demoEmails } },
    select: { id: true },
  });
  if (existing.length) {
    const ids = existing.map((u) => u.id);
    console.log(`[seed] removing previous demo data for ${ids.length} users`);
    const conversationIds = (
      await db.conversationMember.findMany({ where: { userId: { in: ids } }, select: { conversationId: true } })
    ).map((m) => m.conversationId);
    const postIds = (await db.post.findMany({ where: { authorId: { in: ids } }, select: { id: true } })).map((p) => p.id);
    const communityIds = (await db.community.findMany({ where: { ownerId: { in: ids } }, select: { id: true } })).map(
      (c) => c.id
    );
    await db.report.deleteMany({
      where: {
        OR: [
          { reporterId: { in: ids } },
          { targetId: { in: [...postIds, ...ids, ...communityIds] } },
        ],
      },
    });
    await db.conversation.deleteMany({ where: { id: { in: conversationIds } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.contactMessage.deleteMany({ where: { email: { endsWith: "@everlink.demo" } } });
    await db.auditLog.deleteMany({ where: { action: { startsWith: "seed." } } });
  }

  console.log("[seed] hashing demo passwords");
  const memberHash = await hash("DemoPass123!", { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 });
  const adminHash = await hash("AdminPass123!", { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 });
  const modHash = await hash("ModPass123!", { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 });

  const users: Record<string, { id: string; displayName: string }> = {};
  for (const u of USERS) {
    const passwordHash = u.role === "ADMIN" ? adminHash : u.role === "MODERATOR" ? modHash : memberHash;
    const created = await db.user.create({
      data: {
        username: u.username,
        email: u.email,
        passwordHash,
        role: u.role,
        verified: true,
        emailVerifiedAt: hoursAgo(24 * 30),
        dateOfBirth: new Date(u.dob),
        onboardedAt: hoursAgo(24 * 25),
        lastActiveAt: hoursAgo(Math.floor(Math.random() * 20)),
        profile: {
          create: {
            displayName: u.displayName,
            bio: u.bio,
            avatarUrl: avatarUrl(u.displayName),
            coverUrl: sceneUrl((u.username.length % 8) + 1),
            countryCode: u.country,
            website: u.website ?? null,
            pronouns: u.pronouns ?? null,
          },
        },
        settings: {
          create: {
            language: u.languages[0] ?? "en",
            connectTopics: u.interests.slice(0, 3),
            connectLanguage: u.languages[1] ?? u.languages[0] ?? "en",
            showCountry: true,
            allowRandomConnect: true,
          },
        },
        interests: { create: u.interests.map((name) => ({ name })) },
        languages: { create: u.languages.map((code) => ({ code })) },
      },
      select: { id: true, username: true, profile: { select: { displayName: true } } },
    });
    users[u.username] = { id: created.id, displayName: created.profile?.displayName ?? u.username };
  }

  const uid = (name: string) => users[name]!.id;

  console.log("[seed] social graph");
  const followPairs: [string, string][] = [
    ["aiko", "maya"],
    ["aiko", "kenji"],
    ["aiko", "sofia"],
    ["aiko", "noor"],
    ["aiko", "luca"],
    ["maya", "aiko"],
    ["kenji", "aiko"],
    ["sofia", "aiko"],
    ["amara", "aiko"],
    ["mateo", "aiko"],
    ["priya", "aiko"],
    ["zara", "aiko"],
    ["sana", "aiko"],
    ["elena", "aiko"],
    ["leo", "aiko"],
    ["maya", "luca"],
    ["luca", "maya"],
    ["kenji", "sofia"],
    ["sofia", "kenji"],
    ["noor", "sofia"],
    ["amara", "sana"],
    ["sana", "amara"],
    ["priya", "elena"],
    ["elena", "priya"],
    ["leo", "maya"],
    ["maya", "leo"],
    ["mateo", "maya"],
    ["maya", "mateo"],
    ["zara", "kenji"],
    ["kenji", "zara"],
    ["admin", "aiko"],
    ["aiko", "admin"],
  ];
  await db.follow.createMany({
    data: followPairs.map(([follower, following]) => ({ followerId: uid(follower), followingId: uid(following) })),
    skipDuplicates: true,
  });

  await db.friendship.createMany({
    data: [
      { requesterId: uid("aiko"), addresseeId: uid("maya"), status: "ACCEPTED" },
      { requesterId: uid("kenji"), addresseeId: uid("aiko"), status: "ACCEPTED" },
      { requesterId: uid("luca"), addresseeId: uid("maya"), status: "ACCEPTED" },
      { requesterId: uid("noor"), addresseeId: uid("sofia"), status: "ACCEPTED" },
      { requesterId: uid("amara"), addresseeId: uid("aiko"), status: "PENDING" },
    ],
  });
  await db.block.create({
    data: { blockerId: uid("priya"), blockedId: uid("leo") },
  });

  console.log("[seed] communities");
  const communityData: {
    slug: string;
    name: string;
    description: string;
    owner: string;
    type: "PUBLIC" | "PRIVATE" | "RESTRICTED";
    country?: string;
    language?: string;
    members: string[];
    image: number;
  }[] = [
    {
      slug: "tokyo-creatives",
      name: "Tokyo Creatives",
      description: "Designers, illustrators and photographers sharing work, studio spots and city inspiration across Tokyo.",
      owner: "kenji",
      type: "PUBLIC",
      country: "JP",
      members: ["aiko", "zara", "elena", "sofia"],
      image: 1,
    },
    {
      slug: "lisbon-digital-nomads",
      name: "Lisbon Digital Nomads",
      description: "Remote workers in Lisbon sharing coworking tips, visa notes, weekend plans and honest advice.",
      owner: "elena",
      type: "PUBLIC",
      country: "PT",
      members: ["luca", "maya", "sofia", "leo", "admin"],
      image: 4,
    },
    {
      slug: "afro-tech-builders",
      name: "Afro Tech Builders",
      description: "A builders community for African tech founders, engineers and designers. Ship, share, support.",
      owner: "amara",
      type: "PUBLIC",
      country: "NG",
      members: ["sana", "noor", "admin", "aiko", "priya"],
      image: 3,
    },
    {
      slug: "latin-kitchen",
      name: "Latin Kitchen",
      description: "Recipes, abuela secrets and regional food stories from across Latin America.",
      owner: "mateo",
      type: "PUBLIC",
      country: "MX",
      members: ["maya", "sofia", "luca", "aiko"],
      image: 7,
    },
    {
      slug: "global-language-exchange",
      name: "Global Language Exchange",
      description: "Practise a language, meet a partner, exchange culture. Weekly themed conversation rooms.",
      owner: "sofia",
      type: "PUBLIC",
      members: ["aiko", "kenji", "noor", "priya", "sana", "luca", "elena"],
      image: 2,
    },
    {
      slug: "mindful-mornings",
      name: "Mindful Mornings",
      description: "A quiet, restricted space for morning routines, journaling prompts and gentle accountability.",
      owner: "priya",
      type: "RESTRICTED",
      members: ["sana", "elena", "noor", "aiko"],
      image: 6,
    },
  ];

  const communities: Record<string, { id: string }> = {};
  for (const c of communityData) {
    const created = await db.community.create({
      data: {
        slug: c.slug,
        name: c.name,
        description: c.description,
        type: c.type,
        countryCode: c.country ?? null,
        language: c.language ?? "en",
        ownerId: uid(c.owner),
        imageUrl: sceneUrl(c.image),
        coverUrl: sceneUrl(((c.image + 2) % 8) + 1),
        guidelines: "Be kind. Stay on topic. No spam, harassment or sharing private information without consent.",
        members: {
          create: [
            { userId: uid(c.owner), role: "OWNER", joinedAt: hoursAgo(24 * 40) },
            ...c.members.map((m, i) => ({
              userId: uid(m),
              role: (m === c.members[0] ? "ADMIN" : "MEMBER") as "ADMIN" | "MEMBER",
              joinedAt: hoursAgo(24 * (20 - i)),
            })),
          ],
        },
      },
      select: { id: true },
    });
    communities[c.slug] = created;
  }

  await db.communityInvitation.create({
    data: { communityId: communities["mindful-mornings"]!.id, inviterId: uid("priya"), inviteeId: uid("aiko") },
  });

  await db.event.createMany({
    data: [
      {
        communityId: communities["global-language-exchange"]!.id,
        creatorId: uid("sofia"),
        title: "Language Exchange Open Mic",
        description: "Bring a 3-minute story in any language. We will pair learners for practice rooms afterwards.",
        startsAt: daysFromNow(3),
        endsAt: new Date(daysFromNow(3).getTime() + 90 * 60 * 1000),
        onlineUrl: "https://example.com/events/language-open-mic",
      },
      {
        communityId: communities["lisbon-digital-nomads"]!.id,
        creatorId: uid("elena"),
        title: "Lisbon coworking meetup",
        description: "A casual afternoon of working side by side, then dinner near Cais do Sodré.",
        startsAt: daysFromNow(9),
        endsAt: new Date(daysFromNow(9).getTime() + 4 * 60 * 60 * 1000),
        locationText: "Cais do Sodré, Lisbon",
        countryCode: "PT",
      },
    ],
  });

  console.log("[seed] posts and conversations");

  const postDefs: {
    author: string;
    body: string;
    type?: "TEXT" | "IMAGE" | "LINK" | "POLL" | "VIDEO";
    visibility?: "PUBLIC" | "FOLLOWERS" | "COMMUNITY";
    community?: string;
    country?: string;
    media?: number[];
    link?: string;
    poll?: string[];
    hours: number;
  }[] = [
    {
      author: "aiko",
      body: "Rainy Tokyo alleys are my favourite studio. Shot this on the way home from Shibuya — no filter, just neon and wet pavement. #Tokyo #Photography #NightWalks",
      type: "IMAGE",
      country: "JP",
      media: [1],
      hours: 2,
    },
    {
      author: "maya",
      body: "New mix is live: 60 minutes of Brazilian house, Angolan kuduro and one very unexpected disco edit. Headphones recommended. #Music #SãoPaulo",
      country: "BR",
      hours: 3,
    },
    {
      author: "kenji",
      body: "Indie dev diary #12: our tiny co-op game finally runs at 60fps on a five-year-old laptop. Next up: controller support and a proper tutorial. #Gaming #IndieDev",
      community: "tokyo-creatives",
      country: "JP",
      hours: 4,
    },
    {
      author: "amara",
      body: "Lagos build night was packed. Twelve teams shipped something small and real in four hours. The energy when people stop waiting for permission is unreal. #Startups #Lagos #BuildInPublic",
      type: "IMAGE",
      country: "NG",
      media: [3],
      hours: 5,
    },
    {
      author: "sofia",
      body: "Language question for the crowd: what is the one phrase in your language that simply cannot be translated? Mine is 'sobremesa'. #Languages #Culture",
      country: "ES",
      type: "POLL",
      poll: ["A word for lingering at the table", "A greeting with no English equal", "I have a phrase, not a word"],
      hours: 6,
    },
    {
      author: "noor",
      body: "Today's market lesson: saffron should smell like honey and hay, never like dust. Bought enough for a week of tagines. #Marrakech #Food #Cooking",
      type: "IMAGE",
      country: "MA",
      media: [5],
      hours: 8,
    },
    {
      author: "luca",
      body: "Typographic detail from a Milan doorway I walk past every day and only noticed this morning. Cities reward slow looking. #Design #Milan",
      country: "IT",
      hours: 9,
    },
    {
      author: "elena",
      body: "Three years remote, three rules that still hold: write decisions down, protect deep-work mornings, and never skip the walk. #RemoteWork #Lisbon",
      country: "PT",
      hours: 11,
    },
    {
      author: "priya",
      body: "Morning practice before standup. Ten years of Bharatanatyam and the warm-up still humbles me. #Dance #Fitness #Bengaluru",
      country: "IN",
      hours: 13,
    },
    {
      author: "mateo",
      body: "Sunday table: mole, tortillas made by hand, and a playlist that starts with boleros and ends somewhere loud. Recipes in the comments. #MexicoCity #Food",
      type: "IMAGE",
      country: "MX",
      media: [7],
      hours: 16,
    },
    {
      author: "sana",
      body: "Before sunrise in Nairobi National Park. The city is right there — you can hear it — and yet this. #Nature #Nairobi #Photography",
      type: "IMAGE",
      country: "KE",
      media: [6],
      hours: 18,
    },
    {
      author: "zara",
      body: "Sketchbook page 41: strangers on the Karachi bus who became friends by the third stop. Art is just paying attention in public. #Art #Karachi",
      country: "PK",
      hours: 20,
    },
    {
      author: "leo",
      body: "Editing a documentary about night-shift workers. The quietest scenes keep turning out to be the most political. #Film #Documentary",
      country: "FR",
      hours: 22,
    },
    {
      author: "aiko",
      body: "A small guide to eating well in Manila on a budget: start with a corner stall, follow the line of taxi drivers, order what the person before you ordered. #Manila #Food",
      country: "PH",
      hours: 25,
    },
    {
      author: "maya",
      body: "Reading about the history of samba and realising how much of the music I love is a story of migration. Sending everyone a long list later. #Music #History",
      country: "BR",
      hours: 27,
    },
    {
      author: "admin",
      body: "Welcome to the communities directory! A quick reminder: post in the community that fits, credit creators, and use Report if something feels off. #Everlink",
      type: "LINK",
      link: "https://example.com/everlink/community-guide",
      hours: 30,
    },
    {
      author: "kenji",
      body: "Lanterns, arcades and one extremely competitive claw machine. Saturday in Tokyo. #Tokyo #Gaming",
      type: "IMAGE",
      country: "JP",
      media: [2],
      hours: 33,
    },
    {
      author: "sofia",
      body: "Open mic night was a joy. Six languages, one room, zero judgement. Next one is in three days — come with a story. #Languages #Barcelona",
      community: "global-language-exchange",
      country: "ES",
      hours: 36,
    },
    {
      author: "amara",
      body: "Weekly reminder that your first customers are not a marketing strategy, they are people. Talk to them like people. #Startups",
      community: "afro-tech-builders",
      hours: 40,
    },
    {
      author: "noor",
      body: "Mint tea is not a drink, it is a pause. The trick is pouring from high enough to build a little foam. #Cooking #Culture",
      community: "latin-kitchen",
      hours: 44,
    },
    {
      author: "priya",
      body: "Three books that changed how I think about attention. Thread below. #Books",
      type: "LINK",
      link: "https://example.com/reading/attention",
      hours: 48,
    },
    {
      author: "elena",
      body: "Lisbon tip: the best coworking cafés are not the ones with the fastest wifi, they are the ones with the kindest staff. #Lisbon #RemoteWork",
      community: "lisbon-digital-nomads",
      country: "PT",
      hours: 52,
    },
    {
      author: "sana",
      body: "Trail running at 6am, photography at 7. The light in Nairobi this week has been absurd. #Nairobi #Photography",
      type: "IMAGE",
      country: "KE",
      media: [4],
      hours: 56,
      visibility: "FOLLOWERS",
    },
    {
      author: "zara",
      body: "Teaching a weekend illustration workshop for teenagers. They draw faster and braver than any professional I know. #Art #Volunteering",
      hours: 60,
    },
    {
      author: "luca",
      body: "The best design advice I ever got: make the first version embarrassingly simple, then listen. #Design",
      community: "lisbon-digital-nomads",
      hours: 66,
    },
    {
      author: "aiko",
      body: "Late-night thought: the internet is at its best when it feels like a hundred kitchens and a few very good conversations. #Everlink",
      hours: 70,
    },
  ];

  const posts: { id: string; author: string; minutes: number }[] = [];
  for (const p of postDefs) {
    const created = await db.post.create({
      data: {
        authorId: uid(p.author),
        body: p.body,
        type: p.type ?? "TEXT",
        visibility: p.visibility ?? (p.community ? "COMMUNITY" : "PUBLIC"),
        communityId: p.community ? communities[p.community]!.id : null,
        countryCode: p.country ?? null,
        linkUrl: p.link ?? null,
        createdAt: hoursAgo(p.hours),
        media: p.media
          ? { create: p.media.map((n, i) => ({ url: sceneUrl(n), mime: "image/svg+xml", type: "image", position: i })) }
          : undefined,
        pollOptions: p.poll
          ? { create: p.poll.map((text, i) => ({ text, position: i })) }
          : undefined,
        hashtags: {
          create: Array.from(new Set((p.body.match(/#([\p{L}\p{N}_]{2,50})/gu) ?? []).map((h) => h.slice(1).toLowerCase()))).map(
            (tag) => ({
              hashtag: { connectOrCreate: { where: { tag }, create: { tag, count: 1 } } },
            })
          ),
        },
      },
      select: { id: true },
    });
    posts.push({ id: created.id, author: p.author, minutes: p.hours * 60 });
  }

  const postId = (i: number) => posts[i]!.id;

  // A repost of Aiko's Tokyo photo by Maya.
  await db.post.create({
    data: {
      authorId: uid("maya"),
      type: "REPOST",
      body: "This is the Tokyo I miss. 📷 by @aiko",
      repostOfId: postId(0),
      createdAt: hoursAgo(1),
      visibility: "PUBLIC",
    },
  });

  await db.comment.createMany({
    data: [
      { postId: postId(0), authorId: uid("maya"), body: "That reflection is unreal. What lens?", createdAt: hoursAgo(1.7) },
      { postId: postId(0), authorId: uid("kenji"), body: "I know this street! Two blocks from the tiny ramen place.", createdAt: hoursAgo(1.4) },
      { postId: postId(0), authorId: uid("zara"), body: "The colour palette 😍 saving this for a study.", createdAt: hoursAgo(1.1) },
      { postId: postId(1), authorId: uid("mateo"), body: "Downloaded. The disco edit is the moment.", createdAt: hoursAgo(2.5) },
      { postId: postId(1), authorId: uid("aiko"), body: "Sending this to everyone I know in Manila.", createdAt: hoursAgo(2) },
      { postId: postId(3), authorId: uid("sana"), body: "This is the energy we need more of.", createdAt: hoursAgo(4.2) },
      { postId: postId(3), authorId: uid("admin"), body: "Featured in the communities spotlight this week.", createdAt: hoursAgo(4) },
      { postId: postId(4), authorId: uid("noor"), body: "In Moroccan Arabic we say 'sbar' — patience with warmth. Not the same thing at all.", createdAt: hoursAgo(5.4) },
      { postId: postId(4), authorId: uid("kenji"), body: "Japanese: 'otsukaresama' — acknowledging someone's effort. No clean translation.", createdAt: hoursAgo(5) },
      { postId: postId(4), authorId: uid("priya"), body: "Tamil 'sollunga' works for so many situations it confuses my English brain.", createdAt: hoursAgo(4.6) },
      { postId: postId(5), authorId: uid("mateo"), body: "Now I need to smell saffron immediately.", createdAt: hoursAgo(7.5) },
      { postId: postId(7), authorId: uid("aiko"), body: "The walk rule is non-negotiable.", createdAt: hoursAgo(10) },
      { postId: postId(9), authorId: uid("sofia"), body: "Recipe list please!", createdAt: hoursAgo(15) },
      { postId: postId(10), authorId: uid("elena"), body: "This is why I keep opening this app.", createdAt: hoursAgo(17) },
      { postId: postId(13), authorId: uid("noor"), body: "Rule three is the real guide.", createdAt: hoursAgo(23) },
      { postId: postId(15), authorId: uid("sofia"), body: "Bookmarked. Also: the guide is genuinely useful.", createdAt: hoursAgo(28) },
      { postId: postId(17), authorId: uid("aiko"), body: "I will be there with a story about train stations.", createdAt: hoursAgo(34) },
      { postId: postId(18), authorId: uid("sana"), body: "Preach.", createdAt: hoursAgo(38) },
    ],
  });

  // A reply to the first comment.
  const firstComment = await db.comment.findFirst({ where: { postId: postId(0), authorId: uid("maya") } });
  if (firstComment) {
    await db.comment.create({
      data: {
        postId: postId(0),
        authorId: uid("aiko"),
        parentId: firstComment.id,
        body: "35mm, wide open. The rain did the rest.",
        createdAt: hoursAgo(1.2),
      },
    });
  }

  const reactions = [
    { userId: uid("maya"), postId: postId(0), type: "LOVE" },
    { userId: uid("kenji"), postId: postId(0), type: "LIKE" },
    { userId: uid("zara"), postId: postId(0), type: "LOVE" },
    { userId: uid("sofia"), postId: postId(0), type: "LIKE" },
    { userId: uid("luca"), postId: postId(0), type: "WOW" },
    { userId: uid("aiko"), postId: postId(1), type: "LOVE" },
    { userId: uid("mateo"), postId: postId(1), type: "LIKE" },
    { userId: uid("kenji"), postId: postId(1), type: "LIKE" },
    { userId: uid("aiko"), postId: postId(2), type: "LIKE" },
    { userId: uid("zara"), postId: postId(2), type: "HAHA" },
    { userId: uid("aiko"), postId: postId(3), type: "LOVE" },
    { userId: uid("sana"), postId: postId(3), type: "LIKE" },
    { userId: uid("priya"), postId: postId(3), type: "LIKE" },
    { userId: uid("noor"), postId: postId(3), type: "LIKE" },
    { userId: uid("aiko"), postId: postId(4), type: "LIKE" },
    { userId: uid("kenji"), postId: postId(4), type: "LIKE" },
    { userId: uid("noor"), postId: postId(4), type: "HAHA" },
    { userId: uid("aiko"), postId: postId(5), type: "LOVE" },
    { userId: uid("mateo"), postId: postId(5), type: "LIKE" },
    { userId: uid("aiko"), postId: postId(9), type: "LOVE" },
    { userId: uid("maya"), postId: postId(9), type: "LIKE" },
    { userId: uid("aiko"), postId: postId(10), type: "LOVE" },
    { userId: uid("kenji"), postId: postId(10), type: "LIKE" },
    { userId: uid("aiko"), postId: postId(15), type: "LIKE" },
    { userId: uid("maya"), postId: postId(15), type: "LIKE" },
    { userId: uid("aiko"), postId: postId(17), type: "LOVE" },
    { userId: uid("maya"), postId: postId(17), type: "LIKE" },
    { userId: uid("aiko"), postId: postId(22), type: "LOVE" },
    { userId: uid("maya"), postId: postId(24), type: "LIKE" },
    { userId: uid("kenji"), postId: postId(23), type: "LIKE" },
    { userId: uid("sofia"), commentId: (await db.comment.findFirst({ where: { postId: postId(0), authorId: uid("zara") } }))?.id, type: "LOVE" },
  ].filter((r) => Boolean(r.postId || r.commentId)) as Prisma.ReactionCreateManyInput[];

  await db.reaction.createMany({ data: reactions, skipDuplicates: true });

  await db.bookmark.createMany({
    data: [
      { userId: uid("aiko"), postId: postId(13) },
      { userId: uid("aiko"), postId: postId(15) },
      { userId: uid("aiko"), postId: postId(4) },
      { userId: uid("maya"), postId: postId(0) },
    ],
    skipDuplicates: true,
  });

  // Poll votes
  const pollOptions = await db.pollOption.findMany({ where: { post: { id: postId(4) } }, orderBy: { position: "asc" } });
  if (pollOptions.length >= 3) {
    await db.pollVote.createMany({
      data: [
        { optionId: pollOptions[0]!.id, userId: uid("maya") },
        { optionId: pollOptions[0]!.id, userId: uid("noor") },
        { optionId: pollOptions[1]!.id, userId: uid("kenji") },
        { optionId: pollOptions[1]!.id, userId: uid("priya") },
        { optionId: pollOptions[1]!.id, userId: uid("elena") },
        { optionId: pollOptions[2]!.id, userId: uid("aiko") },
      ],
      skipDuplicates: true,
    });
  }

  console.log("[seed] direct messages");
  async function createConversation(
    type: "DIRECT" | "GROUP",
    title: string | null,
    creator: string,
    memberNames: string[],
    messages: { from: string; body: string; minutesAgo: number }[]
  ) {
    const members = Array.from(new Set([creator, ...memberNames]));
    const conv = await db.conversation.create({
      data: {
        type,
        title,
        createdById: uid(creator),
        lastMessageAt: hoursAgo(messages[messages.length - 1]?.minutesAgo ?? 1),
        members: {
          create: members.map((m) => ({
            userId: uid(m),
            lastReadAt: m === "aiko" && type === "DIRECT" ? hoursAgo(20) : hoursAgo(0.2),
          })),
        },
      },
      select: { id: true },
    });
    for (const m of messages) {
      await db.message.create({
        data: {
          conversationId: conv.id,
          senderId: uid(m.from),
          body: m.body,
          createdAt: hoursAgo(m.minutesAgo),
        },
      });
    }
    return conv.id;
  }

  const dmMaya = await createConversation("DIRECT", null, "aiko", ["maya"], [
    { from: "maya", body: "Your Tokyo photo made me miss a city I have never lived in.", minutesAgo: 27 },
    { from: "aiko", body: "That is the highest compliment. Have you been?", minutesAgo: 26 },
    { from: "maya", body: "Not yet! Planning March. Any neighbourhoods for someone who wants to eat well and stay out late?", minutesAgo: 25 },
    { from: "aiko", body: "Shimokitazawa for music and tiny bars. Kōenji if you want it calmer but still alive.", minutesAgo: 24 },
    { from: "maya", body: "Saving this. I will send you a São Paulo list in return.", minutesAgo: 18 },
    { from: "aiko", body: "Deal. Send the playlist too 🎧", minutesAgo: 17 },
    { from: "maya", body: "Already in your notifications.", minutesAgo: 2 },
  ]);

  await createConversation("DIRECT", null, "amara", ["aiko"], [
    { from: "amara", body: "Hi Aiko! Loved your Manila food guide. We are building a travel-and-tech community and would love your voice.", minutesAgo: 50 },
    { from: "aiko", body: "That sounds great. Send me the details?", minutesAgo: 48 },
    { from: "amara", body: "Sent a friend request too. No pressure on either.", minutesAgo: 47 },
  ]);

  await createConversation("GROUP", "Language Exchange Crew", "sofia", ["aiko", "kenji", "noor"], [
    { from: "sofia", body: "Open mic plan: Thursday 19:00 CET, 3 minutes each, any language.", minutesAgo: 120 },
    { from: "kenji", body: "I can do a short piece about learning English from games.", minutesAgo: 118 },
    { from: "noor", body: "I will read a paragraph in Darija and translate live.", minutesAgo: 115 },
    { from: "aiko", body: "Tagalog ghost stories. You have been warned.", minutesAgo: 110 },
    { from: "sofia", body: "Perfect. I will make the room and share the link here.", minutesAgo: 108 },
    { from: "kenji", body: "Can we do a practice room for beginners after?", minutesAgo: 100 },
    { from: "sofia", body: "Yes — 20 minutes, mixed pairs, prompts on screen.", minutesAgo: 98 },
    { from: "aiko", body: "I will bring prompts in Japanese and Tagalog.", minutesAgo: 90 },
    { from: "noor", body: "Adding a few in French too.", minutesAgo: 85 },
    { from: "sofia", body: "This is going to be good.", minutesAgo: 30 },
  ]);

  // Unread count for Aiko on the group conversation.
  await db.conversationMember.updateMany({
    where: { userId: uid("aiko"), conversation: { title: "Language Exchange Crew" } },
    data: { lastReadAt: hoursAgo(2) },
  });

  console.log("[seed] moments, live room, notifications");
  const storyData = [
    { author: "maya", type: "IMAGE" as const, url: momentUrl(1), body: "Sound check, São Paulo", hours: 4, audience: "PUBLIC" as const },
    { author: "kenji", type: "TEXT" as const, url: null, body: "Shipped the tutorial build. Small wins.", hours: 6, audience: "PUBLIC" as const },
    { author: "sofia", type: "TEXT" as const, url: null, body: "Open mic countdown: 3 days. Bring a story.", hours: 8, audience: "FOLLOWERS" as const },
    { author: "amara", type: "IMAGE" as const, url: momentUrl(3), body: "Build night leftovers", hours: 10, audience: "PUBLIC" as const },
    { author: "aiko", type: "IMAGE" as const, url: momentUrl(2), body: "Studio day", hours: 12, audience: "PUBLIC" as const },
  ];
  for (const s of storyData) {
    const story = await db.story.create({
      data: {
        authorId: uid(s.author),
        type: s.type,
        mediaUrl: s.url,
        body: s.body,
        background: s.type === "TEXT" ? "#29204C" : "#8057E8",
        audience: s.audience,
        createdAt: hoursAgo(s.hours),
        expiresAt: hoursFromNow(24 - s.hours),
      },
    });
    await db.storyView.createMany({
      data: [
        { storyId: story.id, viewerId: uid(s.author) },
        ...(s.author !== "aiko" ? [{ storyId: story.id, viewerId: uid("aiko") }] : []),
        ...(s.author !== "maya" ? [{ storyId: story.id, viewerId: uid("maya") }] : []),
      ],
      skipDuplicates: true,
    });
    if (s.author !== "maya") {
      await db.storyReaction.createMany({
        data: [{ storyId: story.id, userId: uid("maya"), type: "LOVE" }],
        skipDuplicates: true,
      });
    }
  }

  const live = await db.liveRoom.create({
    data: {
      title: "Culture Swap: Tokyo ↔ Manila",
      description: "Aiko and Kenji compare street food, train etiquette and the best time to visit. Audience questions welcome.",
      hostId: uid("aiko"),
      type: "PUBLIC",
      topic: "Culture",
      countryCode: "JP",
      startedAt: hoursAgo(0.4),
      communityId: communities["global-language-exchange"]!.id,
      participants: {
        create: [
          { userId: uid("aiko"), role: "HOST", muted: false, cameraOn: true },
          { userId: uid("kenji"), role: "SPEAKER", muted: false, cameraOn: true },
          { userId: uid("maya"), role: "AUDIENCE" },
          { userId: uid("sofia"), role: "AUDIENCE" },
        ],
      },
    },
  });
  await db.liveRoom.create({
    data: {
      title: "Sunday sketch club",
      description: "Zara hosts a relaxed drawing session with prompts every ten minutes.",
      hostId: uid("zara"),
      type: "PUBLIC",
      topic: "Art",
      status: "ENDED",
      startedAt: hoursAgo(30),
      endedAt: hoursAgo(28),
      countryCode: "PK",
    },
  });

  const notifData: {
    userId: string;
    type: NotificationType;
    actorId: string;
    title: string;
    body?: string;
    link?: string;
    dedupeKey: string;
    read?: boolean;
    hours: number;
  }[] = [
    { userId: uid("aiko"), type: "FOLLOW", actorId: uid("amara"), title: "Amara Okafor started following you", link: "/profile/amara", dedupeKey: "seed-follow-1", hours: 1 },
    { userId: uid("aiko"), type: "FRIEND_REQUEST", actorId: uid("amara"), title: "Amara Okafor sent you a friend request", link: "/profile/amara", dedupeKey: "seed-friend-1", hours: 1.2 },
    { userId: uid("aiko"), type: "POST_LIKE", actorId: uid("maya"), title: "Maya Ferreira loved your post", body: "Rainy Tokyo alleys are my favourite studio…", link: "/profile/aiko", dedupeKey: "seed-like-1", hours: 1.5 },
    { userId: uid("aiko"), type: "POST_COMMENT", actorId: uid("kenji"), title: "Kenji Watanabe commented on your post", body: "I know this street! Two blocks from the tiny ramen place.", link: "/profile/aiko", dedupeKey: "seed-comment-1", hours: 1.4 },
    { userId: uid("aiko"), type: "MESSAGE", actorId: uid("maya"), title: "New message from Maya Ferreira", body: "Already in your notifications.", link: `/messages?c=${dmMaya}`, dedupeKey: "seed-message-1", hours: 2 },
    { userId: uid("aiko"), type: "COMMUNITY_INVITE", actorId: uid("priya"), title: "Priya Nair invited you to Mindful Mornings", body: "A quiet, restricted space for morning routines…", link: "/communities/mindful-mornings", dedupeKey: "seed-invite-1", hours: 5 },
    { userId: uid("aiko"), type: "LIVE_INVITE", actorId: uid("kenji"), title: "Kenji Watanabe invited you to a live room", body: "Culture Swap: Tokyo ↔ Manila", link: `/live/${live.id}`, dedupeKey: "seed-live-1", hours: 0.3, read: true },
    { userId: uid("aiko"), type: "SYSTEM", actorId: uid("admin"), title: "New sign-in to your account", body: "Chrome on Windows · Manila, PH (demo)", link: "/settings?tab=security", dedupeKey: "seed-security-1", hours: 26, read: true },
    { userId: uid("aiko"), type: "FOLLOW", actorId: uid("sana"), title: "Sana Mwangi started following you", link: "/profile/sana", dedupeKey: "seed-follow-2", hours: 30, read: true },
    { userId: uid("maya"), type: "MESSAGE", actorId: uid("aiko"), title: "New message from Aiko Tanaka", body: "That is the highest compliment. Have you been?", link: `/messages?c=${dmMaya}`, dedupeKey: "seed-message-2", hours: 26, read: true },
    { userId: uid("sofia"), type: "COMMUNITY_INVITE", actorId: uid("priya"), title: "Priya Nair invited you to Mindful Mornings", link: "/communities/mindful-mornings", dedupeKey: "seed-invite-2", hours: 48, read: true },
  ];
  for (const n of notifData) {
    await db.notification.create({
      data: {
        userId: n.userId,
        type: n.type,
        actorId: n.actorId,
        title: n.title,
        body: n.body ?? "",
        link: n.link ?? null,
        dedupeKey: n.dedupeKey,
        readAt: n.read ? hoursAgo(n.hours) : null,
        createdAt: hoursAgo(n.hours),
      },
    });
  }

  console.log("[seed] reports and moderation");
  const reportOne = await db.report.create({
    data: {
      reporterId: uid("sofia"),
      targetType: "POST",
      targetId: postId(12),
      reason: "Privacy violation",
      details: "Demo report: this post appears to share a colleague's private schedule.",
      status: "PENDING",
      createdAt: hoursAgo(3),
    },
  });
  await db.report.create({
    data: {
      reporterId: uid("zara"),
      targetType: "USER",
      targetId: uid("leo"),
      reason: "Harassment or bullying",
      details: "Demo report: repeated unwelcome replies in a comment thread.",
      status: "PENDING",
      createdAt: hoursAgo(7),
    },
  });
  const reviewed = await db.report.create({
    data: {
      reporterId: uid("priya"),
      targetType: "COMMENT",
      targetId: (await db.comment.findFirst({ where: { postId: postId(1) } }))?.id ?? postId(1),
      reason: "Spam or misleading content",
      details: "Demo report: duplicate promotional comment.",
      status: "RESOLVED",
      reviewedById: uid("moderator"),
      resolutionNote: "Removed the duplicate reply and warned the author.",
      createdAt: hoursAgo(50),
    },
  });
  await db.moderationAction.create({
    data: {
      moderatorId: uid("moderator"),
      targetUserId: uid("luca"),
      targetType: "COMMENT",
      targetId: reviewed.targetId,
      action: "WARN",
      note: "Demo moderation record: duplicate promotional comment removed, author warned.",
    },
  });
  await db.auditLog.createMany({
    data: [
      {
        actorId: uid("moderator"),
        action: "seed.moderation.resolve_report",
        targetType: "REPORT",
        targetId: reviewed.id,
        metadata: { note: "Demo audit entry created by the development seed." },
        createdAt: hoursAgo(49),
      },
      {
        actorId: uid("admin"),
        action: "seed.site.initialize",
        targetType: "SITE",
        metadata: { note: "Demo site settings initialized by the development seed." },
        createdAt: hoursAgo(60),
      },
    ],
  });

  await db.contactMessage.create({
    data: {
      name: "Jordan Lee",
      email: "jordan.lee@example.com",
      subject: "Partnership question",
      body: "Hello Everlink team — we run a small language school and would love to explore a community partnership. Demo contact message.",
      createdAt: hoursAgo(14),
    },
  });

  console.log("[seed] site settings");
  const settings = [
    { key: "siteName", value: "Everlink" },
    { key: "registrationOpen", value: "true" },
    { key: "maintenanceMessage", value: "" },
    { key: "requireAdminMfa", value: "false" },
  ];
  for (const s of settings) {
    await db.siteSetting.upsert({ where: { key: s.key }, update: { value: s.value }, create: s });
  }

  // Recalculate hashtag counts from seeded posts.
  await db.$executeRaw`
    UPDATE "Hashtag" h SET count = (SELECT COUNT(*) FROM "PostHashtag" ph WHERE ph."hashtagId" = h.id)
  `;

  console.log("[seed] done");
  console.log(`[seed] ${USERS.length} demo users · ${postDefs.length + 1} posts · ${communityData.length} communities`);
  console.log("[seed] admin@everlink.demo / AdminPass123! · aiko@everlink.demo / DemoPass123!");
}

main()
  .catch((error) => {
    console.error("[seed] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
