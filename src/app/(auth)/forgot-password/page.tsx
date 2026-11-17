"use client";

import * as React from "react";
import Link from "next/link";
import { KeyRound, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { apiFetch, errorMessage } from "@/lib/client";

export default function ForgotPasswordPage() {
  const [pending, setPending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [manualLink, setManualLink] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const data = await apiFetch<{ manualResetUrl?: string | null }>("/api/v1/auth/forgot-password", {
        method: "POST",
        json: { email: String(form.get("email") || "") },
      });
      setManualLink(data.manualResetUrl ?? null);
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="surface-card p-6 sm:p-8">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <KeyRound className="h-6 w-6" />
      </div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Reset your password</h1>
      <p className="mt-1.5 text-[13.5px] leading-6 text-ink-muted">
        Enter the email address on your account and we&apos;ll send a secure reset link.
      </p>

      {sent ? (
        <div className="mt-6">
          <div className="flex items-start gap-3 rounded-xl bg-mint/10 p-4">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-mint" />
            <p className="text-[12.5px] leading-5 text-ink-muted">
              If an account exists for that email, a reset link is on its way. The link expires in 1 hour.
            </p>
          </div>
          {manualLink && (
            <div className="mt-4 rounded-xl border border-dashed border-line bg-surface-2 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">One-time reset link</p>
              <p className="mt-1 text-[11.5px] leading-5 text-ink-faint">
                Email delivery is not configured on this server, so use this link directly.
              </p>
              <Link href={manualLink} className="mt-1 block break-all text-[12.5px] font-medium text-brand hover:underline">
                {manualLink}
              </Link>
            </div>
          )}
          <Link href="/login" className="mt-6 inline-block">
            <Button variant="outline">Back to sign in</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
          {error && <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-[13px] text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" className="mt-5 w-full" loading={pending}>
            Send reset link
          </Button>
          <Link href="/login" className="mt-4 block text-center text-[12.5px] font-medium text-ink-muted hover:text-ink">
            Back to sign in
          </Link>
        </form>
      )}
    </div>
  );
}
