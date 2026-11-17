"use client";

import * as React from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { apiFetch, errorMessage } from "@/lib/client";

export function ContactForm() {
  const [pending, setPending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      await apiFetch("/api/v1/contact", {
        method: "POST",
        json: {
          name: String(form.get("name") || ""),
          email: String(form.get("email") || ""),
          subject: String(form.get("subject") || ""),
          body: String(form.get("body") || ""),
        },
      });
      setSent(true);
    } catch (err) {
      const e = err as { details?: Record<string, string[]> };
      setFieldErrors(e.details ?? {});
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-line bg-surface p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-mint" />
        <h2 className="mt-4 font-display text-xl font-semibold text-ink">Message sent</h2>
        <p className="mt-2 max-w-sm text-[13.5px] leading-6 text-ink-muted">
          Thanks for reaching out. Our team reviews messages and will reply to the email address you provided.
        </p>
        <Button className="mt-5" variant="outline" onClick={() => setSent(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" autoComplete="name" required maxLength={80} />
          <FieldError>{fieldErrors.name?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required maxLength={254} />
          <FieldError>{fieldErrors.email?.[0]}</FieldError>
        </div>
      </div>
      <div className="mt-4">
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" required maxLength={120} placeholder="How can we help?" />
        <FieldError>{fieldErrors.subject?.[0]}</FieldError>
      </div>
      <div className="mt-4">
        <Label htmlFor="body">Message</Label>
        <Textarea id="body" name="body" rows={6} required maxLength={5000} placeholder="Include as much detail as you can..." />
        <FieldError>{fieldErrors.body?.[0]}</FieldError>
      </div>
      {error && <p className="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-[13px] text-red-600 dark:text-red-400">{error}</p>}
      <Button type="submit" className="mt-5 w-full sm:w-auto" loading={pending}>
        <Send className="h-4 w-4" /> Send message
      </Button>
      <p className="mt-3 text-[11.5px] leading-5 text-ink-faint">
        For urgent safety concerns, contact local emergency services first. Privacy requests are handled according to
        our Privacy Policy.
      </p>
    </form>
  );
}
