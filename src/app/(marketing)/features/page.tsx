import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Bell,
  Camera,
  Globe2,
  Languages,
  MessageSquare,
  Radio,
  ShieldCheck,
  Sparkles,
  UsersRound,
  UserRoundSearch,
  Vote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Features" };

const GROUPS = [
  {
    icon: Globe2,
    title: "Global social feed",
    text: "Share text, photos, videos, links and polls. React, comment in threads, repost and bookmark. Choose between a following feed, latest posts and trending hashtags.",
    points: ["Multi-image posts", "Poll voting with live results", "Hashtags & search", "Visibility controls"],
  },
  {
    icon: UserRoundSearch,
    title: "People discovery",
    text: "Find people through shared interests, languages, countries and mutual connections. Search by username or display name and sort by relevance.",
    points: ["Interest filters", "Country & language filters", "Follow, friend, block, report", "Private fields stay private"],
  },
  {
    icon: Sparkles,
    title: "Random Connect",
    text: "Match with someone new based on interests and preferred language. Both sides opt in, can skip or end anytime, and minors are only matched with peers.",
    points: ["Interest & language matching", "Rate-limited queue", "Age-aware eligibility", "Block & report built in"],
  },
  {
    icon: MessageSquare,
    title: "Real-time messaging",
    text: "Direct and group conversations with delivery in real time, attachments, replies, reactions, typing indicators and read receipts.",
    points: ["Private conversations", "Image, video, voice & file attachments", "Read receipts & presence", "Conversation search"],
  },
  {
    icon: UsersRound,
    title: "Communities",
    text: "Create public, private or restricted communities with roles for owners, admins, moderators and members. Post, invite, host events and moderate.",
    points: ["Role-based permissions", "Community events", "Invitations", "Report community content"],
  },
  {
    icon: Camera,
    title: "Moments",
    text: "Share 24-hour stories with photos, videos or text. Reactions, replies and viewer lists. Expiration is enforced by the server.",
    points: ["24-hour expiry enforced in the database", "Audience controls", "Reactions & replies", "Viewer lists"],
  },
  {
    icon: Radio,
    title: "Live rooms",
    text: "Host public or private voice and video rooms with a WebRTC mesh, host controls, speaker permissions and live chat with consent-based media.",
    points: ["Host / speaker / audience", "Mute & camera controls", "Live chat", "Report participants"],
  },
  {
    icon: Languages,
    title: "Language Bridge",
    text: "Translate posts, comments and messages into your language while the original stays available. Powered by a server-side provider integration.",
    points: ["Original text preserved", "Cached translations", "Loading & error states", "Provider keys stay server-side"],
  },
  {
    icon: Bell,
    title: "Notifications",
    text: "Follows, friend requests, reactions, comments, messages, invitations and security alerts, with real-time updates and granular preferences.",
    points: ["Real-time delivery", "Read / unread states", "Per-type preferences", "De-duplicated"],
  },
  {
    icon: ShieldCheck,
    title: "Safety & moderation",
    text: "Reporting and blocking across the product, human moderation workflows, warnings, suspensions, appeals and a complete audit trail.",
    points: ["Report posts, people, messages & rooms", "Moderator review queue", "Audit logs", "Account data export & deletion"],
  },
];

export default function FeaturesPage() {
  return (
    <div>
      <section className="mesh-bg border-b border-line bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <Badge variant="default" className="mb-5">
            <Vote className="h-3.5 w-3.5" /> Platform overview
          </Badge>
          <h1 className="text-balance font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Every way to connect, in one place.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-8 text-ink-muted">
            From a global feed to private voice rooms, Everlink gives you the tools to share, discover and build
            friendships across borders.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/register">
              <Button size="lg">
                Join free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/about">
              <Button size="lg" variant="outline">
                How it works
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="stagger-list grid gap-5 md:grid-cols-2" data-reveal>
          {GROUPS.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.title} className="surface-card card-lift flex flex-col p-6 hover:border-brand/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="mint">Included</Badge>
                </div>
                <h2 className="mt-4 font-display text-lg font-semibold text-ink">{group.title}</h2>
                <p className="mt-2 text-[13.5px] leading-6 text-ink-muted">{group.text}</p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {group.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-[12.5px] text-ink-muted">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-mint" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-12 rounded-2xl border border-line bg-surface-2 p-6 sm:p-8" data-reveal>
          <h2 className="font-display text-lg font-semibold text-ink">External services & configuration</h2>
          <p className="mt-2 max-w-3xl text-[13.5px] leading-6 text-ink-muted">
            Some capabilities depend on credentials supplied by the operator. Everlink documents these clearly and
            never simulates a working integration:
          </p>
          <ul className="mt-4 grid gap-2 text-[13px] text-ink-muted sm:grid-cols-2">
            <li>• SMTP: verification, reset and security emails</li>
            <li>• Translation provider (LibreTranslate or Google): Language Bridge</li>
            <li>• Redis: optional distributed rate limiting and multi-instance presence</li>
          </ul>
          <p className="mt-4 text-[12.5px] text-ink-faint">
            Without SMTP, verification and password reset links are written to a local outbox for development. Without a
            translation provider, Language Bridge shows a clear configuration message. Live rooms use direct WebRTC and
            work without a media vendor for small rooms.
          </p>
        </div>
      </section>
    </div>
  );
}
