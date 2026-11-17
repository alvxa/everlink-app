import type { Metadata } from "next";
import { Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <Badge variant="default" className="mb-4">
            <Mail className="h-3.5 w-3.5" /> Contact
          </Badge>
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink">Let&apos;s talk.</h1>
          <p className="mt-3 text-[15px] leading-7 text-ink-muted">
            Questions, feedback, moderation appeals, privacy requests or partnership ideas: send us a message and the
            right team will receive it.
          </p>
          <div className="mt-8 space-y-4">
            <div className="flex gap-3 rounded-2xl border border-line bg-surface p-4">
              <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
              <div>
                <p className="text-sm font-semibold text-ink">Community & moderation</p>
                <p className="mt-1 text-[12.5px] leading-5 text-ink-muted">
                  Report appeals, safety concerns or guideline questions.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl border border-line bg-surface p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-mint" />
              <div>
                <p className="text-sm font-semibold text-ink">Privacy & data</p>
                <p className="mt-1 text-[12.5px] leading-5 text-ink-muted">
                  Export, deletion or privacy rights requests. You can also do this instantly in Settings → Data.
                </p>
              </div>
            </div>
          </div>
          <p className="mt-6 text-[12px] leading-5 text-ink-faint">
            Messages are stored securely and visible only to authorized team members. We never ask for your password.
          </p>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}
