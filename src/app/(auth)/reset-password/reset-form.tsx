"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { apiFetch, errorMessage } from "@/lib/client";

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      await apiFetch("/api/v1/auth/reset-password", { method: "POST", json: { token, password } });
      setDone(true);
    } catch (err) {
      const e = err as { details?: Record<string, string[]> };
      setFieldErrors(e.details ?? {});
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <div className="surface-card p-6 text-center sm:p-8">
        <p className="text-sm font-semibold text-ink">This reset link is missing its token.</p>
        <p className="mt-1 text-[13px] text-ink-muted">Request a new link to continue.</p>
        <Link href="/forgot-password" className="mt-5 inline-block">
          <Button>Request reset link</Button>
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="surface-card p-6 text-center sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-mint/10 text-mint">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-ink">Password updated</h1>
        <p className="mt-2 text-[13.5px] leading-6 text-ink-muted">
          All previous sessions were signed out. Sign in with your new password.
        </p>
        <Link href="/login" className="mt-6 inline-block">
          <Button>Sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="surface-card p-6 sm:p-8">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <Lock className="h-6 w-6" />
      </div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Choose a new password</h1>
      <p className="mt-1.5 text-[13.5px] leading-6 text-ink-muted">Use at least 10 characters with a letter and a number.</p>
      <form onSubmit={onSubmit} className="mt-6">
        <div>
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
          <FieldError>{fieldErrors.password?.[0]}</FieldError>
        </div>
        <div className="mt-4">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
        </div>
        {error && <p className="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-[13px] text-red-600 dark:text-red-400">{error}</p>}
        <Button type="submit" className="mt-5 w-full" loading={pending}>
          Update password
        </Button>
      </form>
    </div>
  );
}
