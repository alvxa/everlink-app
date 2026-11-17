import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Globe2, HeartHandshake, Languages, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div>
      <section className="mesh-bg border-b border-line bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <Badge variant="mint" className="mb-5">
            <Globe2 className="h-3.5 w-3.5" /> Our mission
          </Badge>
          <h1 className="text-balance font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            A social network built for a connected world.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-8 text-ink-muted">
            Everlink exists to make international friendship simple. We combine the best parts of social feeds,
            messaging, communities and live conversation, with privacy and safety treated as product features, not
            afterthoughts.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="stagger-list grid gap-6 md:grid-cols-3" data-reveal>
          {[
            {
              icon: HeartHandshake,
              title: "People first",
              text: "Every feature is measured by whether it helps real people build real relationships across cultures.",
            },
            {
              icon: ShieldCheck,
              title: "Privacy by default",
              text: "Location is optional, visibility is configurable, and precise location is never exposed.",
            },
            {
              icon: Languages,
              title: "Open to everyone",
              text: "Language, country and culture should connect us. Translation tools help conversations cross borders.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="surface-card card-lift p-6 hover:border-brand/30">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="font-display text-base font-semibold text-ink">{item.title}</h2>
                <p className="mt-2 text-[13.5px] leading-6 text-ink-muted">{item.text}</p>
              </div>
            );
          })}
        </div>

        <div className="prose-content mt-14" data-reveal>
          <h2>Why we built Everlink</h2>
          <p>
            Most social platforms optimize for attention. Everlink optimizes for connection. Instead of infinite
            algorithmic ranking, you get clear choices: a following feed, a latest feed, country hubs, communities and
            direct conversations. You decide where your attention goes.
          </p>
          <h2>What makes Everlink different</h2>
          <ul>
            <li>
              <strong className="text-ink">Global by design.</strong> Country hubs, language preferences and culture
              discovery are part of the core experience, not an add-on.
            </li>
            <li>
              <strong className="text-ink">Real-time, not fake activity.</strong> Message delivery, typing indicators,
              presence and live rooms run on real WebSocket infrastructure. Counts shown in the product come from the
              database.
            </li>
            <li>
              <strong className="text-ink">Safety guardrails.</strong> Reporting and blocking are available throughout
              the platform. Random matching is age-aware and never pairs adults with minors.
            </li>
            <li>
              <strong className="text-ink">Your data is yours.</strong> You can export your data or delete your account
              from Settings at any time.
            </li>
          </ul>

          <h2>How Everlink is built</h2>
          <p>
            Everlink runs on Next.js and React with a versioned REST API, a modular service layer and Socket.IO for
            real-time events. PostgreSQL with Prisma stores accounts, posts, communities, conversations and moderation
            records. Authentication uses Argon2id password hashing, database-backed sessions in secure cookies and
            optional TOTP two-factor authentication.
          </p>
          <p>
            Integrations that require credentials (email delivery, translation providers and optional Redis rate
            limiting) are documented and configured through environment variables. The platform never pretends an
            unconfigured external service is working.
          </p>
        </div>

        <div className="mt-12 rounded-2xl border border-line bg-gradient-to-br from-violet-deep to-midnight p-8 text-center text-white">
          <Sparkles className="mx-auto h-6 w-6 text-emerald-300" />
          <h2 className="mt-3 font-display text-2xl font-bold">One world. Different cultures.</h2>
          <p className="mt-2 text-sm text-white/70">Come build your corner of it.</p>
          <Link href="/register" className="mt-5 inline-block">
            <Button variant="secondary" className="bg-white text-midnight hover:bg-white/90">
              Join Everlink <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
