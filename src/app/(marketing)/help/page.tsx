import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, LifeBuoy, Lock, MessageSquare, Settings2, ShieldCheck, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Help Center" };

const FAQS = [
  {
    q: "How do I verify my email address?",
    a: "After registering, open the verification link sent to your email. In local development without SMTP configured, the link is written to storage/mail/outbox.log and shown on the verify-email page. You can request a new link from that page.",
  },
  {
    q: "How do I change who can message me?",
    a: "Open Settings → Privacy. You can limit messages to friends, control profile discoverability, hide your country and hide your online status.",
  },
  {
    q: "How does Random Connect keep me safe?",
    a: "Random Connect is opt-in and rate limited. Matching only uses eligible, discoverable users who enabled it. Adults are matched with adults, and minors only with peers within two years of age. You can skip, leave, block or report at any time.",
  },
  {
    q: "How do I translate a post or message?",
    a: "Open the post menu or message menu and choose Translate. The original text always remains available. Translation requires the operator to configure a supported provider; if it is not configured, Everlink explains that clearly instead of showing a fake result.",
  },
  {
    q: "How long do Moments last?",
    a: "Moments expire 24 hours after posting. Expiration is enforced on the server, so expired moments cannot be retrieved through the API even if a page still has old state.",
  },
  {
    q: "How do I report someone?",
    a: "Use the report option on a profile, post, comment, message, story or live room. Reports go to the moderation queue with the reason and any details you provide. You can also block the person immediately from their profile.",
  },
  {
    q: "Can I export or delete my data?",
    a: "Yes. Settings → Data lets you download a JSON export of your profile, posts, comments, messages and account data, and delete your account. Deletion revokes sessions and anonymizes your profile.",
  },
  {
    q: "Why can't I post yet?",
    a: "New accounts must verify their email before posting, commenting, messaging or creating communities. This protects the community from spam and abuse.",
  },
];

const TOPICS = [
  { icon: UserRound, title: "Account & profile", text: "Edit your profile, privacy and visibility settings.", href: "/settings" },
  { icon: Lock, title: "Security & login", text: "Password, sessions, two-factor authentication.", href: "/settings" },
  { icon: MessageSquare, title: "Messaging", text: "Conversations, attachments, read receipts.", href: "/messages" },
  { icon: Settings2, title: "Preferences", text: "Theme, language and notifications.", href: "/settings" },
  { icon: ShieldCheck, title: "Safety", text: "Reporting, blocking and community guidelines.", href: "/community-guidelines" },
  { icon: LifeBuoy, title: "Contact support", text: "Reach the team for anything else.", href: "/contact" },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <div className="text-center">
        <Badge variant="ocean" className="mb-4">
          <LifeBuoy className="h-3.5 w-3.5" /> Help Center
        </Badge>
        <h1 className="font-display text-4xl font-bold tracking-tight text-ink">How can we help?</h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-7 text-ink-muted">
          Quick answers about your account, privacy, messaging and safety on Everlink.
        </p>
      </div>

      <div className="stagger-list mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-reveal>
        {TOPICS.map((topic) => {
          const Icon = topic.icon;
          return (
            <Link
              key={topic.title}
              href={topic.href}
              className="rounded-2xl border border-line bg-surface p-4 transition hover:border-electric/40 hover:shadow-card"
            >
              <Icon className="h-5 w-5 text-brand" />
              <p className="mt-3 text-sm font-semibold text-ink">{topic.title}</p>
              <p className="mt-1 text-[12.5px] leading-5 text-ink-muted">{topic.text}</p>
            </Link>
          );
        })}
      </div>

      <h2 className="mt-14 font-display text-2xl font-bold tracking-tight text-ink">Frequently asked questions</h2>
      <div className="mt-5 divide-y divide-line rounded-2xl border border-line bg-surface">
        {FAQS.map((faq) => (
          <details key={faq.q} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14px] font-semibold text-ink">
              {faq.q}
              <span className="text-ink-faint transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2.5 text-[13.5px] leading-6 text-ink-muted">{faq.a}</p>
          </details>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-line bg-surface-2 p-6 sm:flex-row">
        <div>
          <p className="font-semibold text-ink">Still need help?</p>
          <p className="text-[13px] text-ink-muted">Send us a message and we&apos;ll get back to you.</p>
        </div>
        <Link href="/contact">
          <Button>
            Contact support <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
