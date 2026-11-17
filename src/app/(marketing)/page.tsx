import Link from "next/link";
import {
  ArrowRight,
  Globe2,
  Languages,
  ShieldCheck,
  Sparkles,
  UsersRound,
  MessageCircleHeart,
  Radio,
  Camera,
  Compass,
  UserRoundSearch,
  Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { GlobeVisual } from "@/components/marketing/globe-visual";
import { db } from "@/lib/db";
import { countryName } from "@/lib/countries";
import { flagEmoji } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getHighlights() {
  try {
    const [communities, memberCount, countries] = await Promise.all([
      db.community.findMany({
        where: { suspendedAt: null, type: "PUBLIC" },
        orderBy: { members: { _count: "desc" } },
        take: 3,
        select: {
          slug: true,
          name: true,
          description: true,
          countryCode: true,
          imageUrl: true,
          _count: { select: { members: true } },
        },
      }),
      db.communityMember.count(),
      db.user.count({ where: { deletedAt: null, profile: { countryCode: { not: null } } } }),
    ]);
    return { communities, memberCount, countries };
  } catch {
    return { communities: [], memberCount: 0, countries: 0 };
  }
}

const FEATURES = [
  {
    icon: Globe2,
    title: "A truly global feed",
    text: "Share thoughts, photos, videos, links and polls with people across borders, with real-time reactions and threaded replies.",
  },
  {
    icon: UserRoundSearch,
    title: "People discovery",
    text: "Find friends by interests, language, country and mutual connections. Every search respects your privacy settings.",
  },
  {
    icon: Sparkles,
    title: "Random Connect",
    text: "Feeling spontaneous? Match with someone new through shared interests and languages, safely and with clear consent.",
  },
  {
    icon: UsersRound,
    title: "Communities",
    text: "Build public, private or restricted spaces for any culture, hobby or cause, with roles, events and moderation.",
  },
  {
    icon: Languages,
    title: "Language Bridge",
    text: "Translate posts and messages on demand while keeping the original text always one tap away.",
  },
  {
    icon: Camera,
    title: "Moments",
    text: "Share temporary stories that disappear after 24 hours: photos, videos or thoughts with expressive reactions.",
  },
  {
    icon: Radio,
    title: "Live rooms",
    text: "Host public or private voice and video rooms with host controls, speaker permissions and live chat.",
  },
  {
    icon: ShieldCheck,
    title: "Safety by design",
    text: "Block, report and control visibility anywhere in the product, backed by human moderation and audit logs.",
  },
];

const COUNTRIES = ["JP", "BR", "DE", "NG", "IN", "FR", "AU", "KE", "MX", "PH"];

export default async function LandingPage() {
  const { communities, memberCount, countries } = await getHighlights();
  const communityCount = communities.length ? memberCount : 0;

  return (
    <div className="overflow-x-hidden">
      {/* Hero */}
      <section className="hero-shell mesh-bg conic-border relative isolate overflow-hidden border-b border-line dark:border-white/[0.06]">
        <div className="absolute left-1/2 top-0 -z-10 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(192,38,211,.12),rgba(37,99,235,.08),transparent)] opacity-80 blur-3xl dark:bg-[radial-gradient(closest-side,rgba(192,38,211,.22),rgba(37,99,235,.12),transparent)] dark:opacity-100" aria-hidden />
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
          <span className="scan-line" />
          <span className="twinkle left-[44%] top-[12%] h-1 w-1" style={{ animationDelay: "0.3s" }} />
          <span className="twinkle left-[62%] top-[24%] h-1.5 w-1.5" style={{ animationDelay: "1.4s" }} />
          <span className="twinkle left-[82%] top-[58%] h-1 w-1" style={{ animationDelay: "2.2s" }} />
          <span className="twinkle left-[30%] top-[74%] h-1 w-1" style={{ animationDelay: "0.9s" }} />
        </div>
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div className="animate-fade-in">
            <Badge variant="neon" className="mb-5 px-3 py-1">
              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,.6)] dark:bg-fuchsia-300 dark:shadow-[0_0_8px_rgba(240,171,252,.9)]" />
              One world. Different cultures. Unlimited connections.
            </Badge>
            <div className="mb-4 flex items-baseline gap-1">
              <span className="word-shine font-display text-[46px] font-bold leading-none tracking-[-0.045em] drop-shadow-[0_1px_0_rgba(255,255,255,.4)] sm:text-6xl lg:text-[68px] dark:drop-shadow-[0_0_38px_rgba(167,139,250,.35)]">
                everlink
              </span>
              <span className="font-display text-[46px] font-bold leading-none text-mint sm:text-6xl lg:text-[68px]">.</span>
            </div>
            <h1 className="text-balance font-display text-[30px] font-bold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[40px] dark:text-white">
              Your World. Your People.
              <br />
              <span className="gradient-text">Your Connections.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-ink-muted sm:text-[16.5px] dark:text-white/75">
              Everlink is the global social network for meeting new people, sharing your world and exploring cultures,
              privately, safely and without borders.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register">
                <Button size="lg" className="w-full bg-gradient-to-r from-electric via-ocean to-mint shadow-[0_14px_32px_-18px_rgba(39,153,232,.75)] ring-1 ring-white/30 sm:w-auto">
                  Join EVERLINK
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/features">
                <Button size="lg" variant="outline" className="w-full border-line bg-surface/70 text-ink hover:bg-surface sm:w-auto dark:border-white/15 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/10 dark:hover:text-white">
                  See what&apos;s inside
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-2.5">
              {[
                { label: "Privacy-first", icon: ShieldCheck, tone: "text-mint" },
                { label: "Language bridge", icon: Languages, tone: "text-ocean dark:text-[#7dd3fc]" },
                { label: "Country hubs", icon: Flag, tone: "text-fuchsia-600 dark:text-fuchsia-300" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-2 rounded-xl border border-line bg-surface/70 px-3 py-2.5 dark:border-white/[0.08] dark:bg-white/[0.035]">
                    <Icon className={`h-4 w-4 shrink-0 ${item.tone}`} />
                    <span className="text-[12px] font-semibold text-ink-muted dark:text-white/75">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="w-full animate-fade-in lg:justify-self-end">
            <GlobeVisual />
          </div>
        </div>
      </section>

      {/* Capability strip */}
      <section className="border-b border-line bg-surface/60 backdrop-blur-xl dark:border-white/[0.06]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-line sm:grid-cols-4 dark:bg-white/[0.06]">
          {[
            { label: "Interest-based matching", icon: Sparkles },
            { label: "Real-time messaging", icon: MessageCircleHeart },
            { label: "24-hour moments", icon: Camera },
            { label: "Community moderation", icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-2.5 bg-surface px-4 py-5 sm:justify-center">
                <Icon className="h-4 w-4 text-brand dark:text-fuchsia-300" />
                <span className="text-[12.5px] font-semibold text-ink-muted">{item.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Beautiful global community */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2" data-reveal>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">A global community</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Built for curiosity, not for algorithms.
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-ink-muted">
              Everlink connects you with people who share your interests and want to learn about the world. Every
              profile, post and conversation is shaped by your choices, not by an opaque ranking system.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Follow people, make friends, and join meaningful communities.",
                "Explore country hubs and cultural conversations.",
                "Control exactly who can see, message and follow you.",
                "Meet in public conversations or private, real-time rooms.",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-[14px] text-ink-muted">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-mint" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="conic-border relative overflow-hidden rounded-[2rem] border border-line bg-gradient-to-br from-[#f3efff] via-[#eef4ff] to-[#ecfaf6] p-6 shadow-card dark:border-transparent dark:from-violet-deep dark:via-violet dark:to-midnight dark:shadow-float sm:p-9">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-electric/15 blur-3xl dark:bg-electric/30" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint dark:text-white/70">Explore cultures</span>
                <Compass className="h-5 w-5 text-mint" />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {COUNTRIES.slice(0, 6).map((code, index) => (
                  <div
                    key={code}
                    className="flex items-center gap-2.5 rounded-xl border border-line bg-surface/80 px-3 py-2.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.06]"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <span className="text-lg">{flagEmoji(code)}</span>
                    <span className="truncate text-[12.5px] font-medium text-ink dark:text-white/85">{countryName(code)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl border border-line bg-surface/80 p-4 dark:border-white/10 dark:bg-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {["Aiko", "Mateo", "Amara", "Lukas"].map((name) => (
                      <Avatar key={name} name={name} size="sm" className="ring-2 ring-white dark:ring-[#211a3d]" />
                    ))}
                  </div>
                  <p className="text-[12.5px] leading-5 text-ink-muted dark:text-white/70">
                    Meet people from <span className="font-semibold text-ink dark:text-white">different cultures</span> who share
                    your interests.
                  </p>
                </div>
              </div>
              <Link
                href="/world"
                className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-mint transition hover:gap-2.5"
              >
                Explore the world map <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature showcase */}
      <section className="border-y border-line bg-surface" id="features">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Platform features</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Everything you need to connect
            </h2>
            <p className="mt-3 text-[15px] leading-7 text-ink-muted">
              Communication, discovery and community tools designed around real human connection.
            </p>
          </div>
          <div className="stagger-list mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-reveal>
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="glass-sheen group relative overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-surface to-surface-2/60 p-5 transition hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-card dark:border-white/[0.08] dark:from-white/[0.045] dark:to-white/[0.015] dark:hover:border-fuchsia-400/40 dark:hover:shadow-[0_24px_60px_-40px_rgba(192,38,211,.9)]"
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent opacity-0 transition group-hover:opacity-100 dark:via-fuchsia-400/50" />
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-brand-soft text-brand shadow-sm dark:border-white/10 dark:bg-gradient-to-br dark:from-fuchsia-500/20 dark:to-electric/15 dark:text-fuchsia-200 dark:shadow-[0_0_24px_-10px_rgba(192,38,211,.9)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-[15px] font-semibold text-ink">{feature.title}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-ink-muted">{feature.text}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-8 text-center">
            <Link href="/features">
              <Button variant="outline">
                Explore every feature <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Communities showcase */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Communities</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Find your people, wherever they are
            </h2>
            <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink-muted">
              Join public spaces for languages, travel, technology, music and more, or start your own community.
            </p>
          </div>
          <Link href="/register">
            <Button variant="outline" className="shrink-0">
              Start a community <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {communities.length > 0 ? (
          <div className="stagger-list mt-10 grid gap-4 md:grid-cols-3" data-reveal>
            {communities.map((community) => (
              <Link
                key={community.slug}
                href="/register"
                className="glass-sheen group overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-[0_20px_44px_-34px_rgba(17,24,39,.35)] dark:border-white/[0.08] dark:bg-gradient-to-b dark:from-white/[0.045] dark:to-white/[0.015] dark:hover:border-fuchsia-400/40 dark:hover:shadow-[0_30px_70px_-44px_rgba(192,38,211,.95)]"
              >
                <div className="relative flex h-24 items-end bg-gradient-to-br from-fuchsia-500/80 via-electric/70 to-ocean/70 p-4">
                  <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,.28),transparent_55%)]" />
                  <span className="relative rounded-full border border-white/20 bg-black/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
                    {community.countryCode ? countryName(community.countryCode) : "Global"}
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-[15px] font-semibold text-ink group-hover:text-brand">
                      {community.name}
                    </h3>
                    <span className="text-[11px] font-semibold text-ink-faint">{community._count.members} members</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[13px] leading-6 text-ink-muted">{community.description}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { title: "Language exchange", emoji: "🗣️" },
              { title: "Travel circles", emoji: "✈️" },
              { title: "Creative studios", emoji: "🎨" },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-dashed border-line bg-surface p-6">
                <span className="text-2xl">{item.emoji}</span>
                <h3 className="mt-3 font-display text-[15px] font-semibold text-ink">{item.title}</h3>
                <p className="mt-1.5 text-[13px] leading-6 text-ink-muted">
                  Communities will appear here as members create them. Be one of the first.
                </p>
              </div>
            ))}
          </div>
        )}

        {communityCount > 0 && (
          <p className="mt-4 text-center text-[12px] text-ink-faint">
            {communityCount.toLocaleString()} community memberships · {countries.toLocaleString()} members sharing a
            country
          </p>
        )}
      </section>

      {/* Safety */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <Badge variant="outline" className="mb-4">
              <ShieldCheck className="h-3.5 w-3.5 text-mint" /> Safety & privacy
            </Badge>
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Your boundaries are the default
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-ink-muted">
              Everlink is designed to help you connect without compromising your privacy. You choose what to share,
              who can reach you and what appears publicly.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Block & report anywhere", "Private profiles", "Age-aware matching", "Data export & deletion"].map((item) => (
                <Badge key={item} variant="muted" className="px-3 py-1 text-[12px]">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
          <div className="stagger-list grid gap-3 sm:grid-cols-2" data-reveal>
            {[
              { title: "You control visibility", text: "Choose public, friends-only or private visibility for posts and profile details." },
              { title: "No precise location", text: "Country is optional. We never expose addresses or live coordinates." },
              { title: "Age-aware safeguards", text: "Random matching never pairs adults with minors, with stricter matching for minors." },
              { title: "Transparent moderation", text: "Reports are reviewed by humans, with recorded actions and appeal paths." },
            ].map((item) => (
              <div key={item.title} className="glass-sheen rounded-2xl border border-line bg-surface p-5 shadow-card transition hover:border-brand/35 dark:border-white/[0.08] dark:bg-gradient-to-b dark:from-white/[0.045] dark:to-white/[0.015] dark:shadow-none dark:hover:border-electric/35">
                <h3 className="text-[13.5px] font-semibold text-ink">{item.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-6 text-ink-muted">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div
          className="conic-border relative overflow-hidden rounded-[2rem] border border-white/15 bg-gradient-to-br from-[#7c5bd6] via-[#5d68c9] to-[#2f6fb5] px-6 py-14 text-center shadow-[0_36px_100px_-58px_rgba(99,102,241,.7)] sm:px-12"
          data-reveal
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,.3),transparent_45%),radial-gradient(circle_at_85%_90%,rgba(94,234,212,.28),transparent_45%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              The world is waiting.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-7 text-white/85">
              Create your profile, pick your interests and start connecting with people beyond boundaries.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/register">
                <Button size="lg" variant="secondary" className="w-full bg-white text-midnight hover:bg-white/90 sm:w-auto">
                  Join EVERLINK free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="ghost" className="w-full text-white hover:bg-white/15 hover:text-white sm:w-auto">
                  Learn about us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
