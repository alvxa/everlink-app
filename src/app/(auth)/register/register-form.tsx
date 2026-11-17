"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, MailCheck, PartyPopper, UserPlus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { apiFetch, errorMessage } from "@/lib/client";
import { cn } from "@/lib/utils";

type RegisterResponse = {
  user: { username: string; displayName?: string | null };
  emailDelivered: boolean;
  manualVerificationUrl: string | null;
};

export function RegisterForm() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [result, setResult] = React.useState<RegisterResponse | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      const data = await apiFetch<RegisterResponse>("/api/v1/auth/register", {
        method: "POST",
        json: {
          username: String(form.get("username") || ""),
          displayName: String(form.get("displayName") || ""),
          email: String(form.get("email") || ""),
          password: String(form.get("password") || ""),
          dateOfBirth: String(form.get("dateOfBirth") || ""),
          acceptTerms: form.get("acceptTerms") === "on",
        },
      });
      setResult(data);
    } catch (err) {
      const e = err as { details?: Record<string, string[]> };
      setFieldErrors(e.details ?? {});
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  if (result) {
    return (
      <div className="surface-card relative overflow-hidden p-6 text-center sm:p-8">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-mint/70 to-transparent" />
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-mint/25 bg-gradient-to-br from-mint/20 to-electric/15 text-mint shadow-[0_0_32px_-10px_rgba(45,212,191,.8)]">
          {result.emailDelivered ? <MailCheck className="h-7 w-7" /> : <PartyPopper className="h-7 w-7" />}
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-ink">Welcome to Everlink, @{result.user.username}</h1>
        <p className="mt-2 text-[13.5px] leading-6 text-ink-muted">
          {result.emailDelivered
            ? "We sent a verification link to your email address. Verify it to unlock posting, messaging and communities."
            : "Email delivery is not configured on this server, so your account cannot receive a verification email. Use the one-time link below to activate it."}
        </p>

        {result.manualVerificationUrl && (
          <div className="mt-5 rounded-xl border border-dashed border-line bg-surface-2 p-4 text-left">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Activate your account</p>
            <Link href={result.manualVerificationUrl} className="mt-1 block break-all text-[12.5px] font-medium text-brand hover:underline">
              {result.manualVerificationUrl}
            </Link>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          {result.manualVerificationUrl ? (
            <>
              <Link href={result.manualVerificationUrl} className={cn(buttonVariants(), "w-full")}>
                Verify email now
              </Link>
              <Link href="/onboarding" className="text-[12.5px] font-medium text-ink-muted hover:text-ink">
                Continue to onboarding first
              </Link>
            </>
          ) : (
            <>
              <Button onClick={() => router.push("/onboarding")}>Continue to onboarding</Button>
              <Link href="/verify-email" className="text-[12.5px] font-medium text-ink-muted hover:text-ink">
                Go to email verification
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card conic-border relative overflow-hidden p-6 sm:p-8">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/70 to-transparent" />
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-brand-soft text-brand dark:border-white/10 dark:bg-gradient-to-br dark:from-fuchsia-500/25 dark:via-electric/20 dark:to-ocean/20 dark:text-[#e9d5ff] dark:shadow-[0_0_28px_-10px_rgba(192,38,211,.9)]">
        <UserPlus className="h-6 w-6" />
      </div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Create your account</h1>
      <p className="mt-1.5 text-[13.5px] leading-6 text-ink-muted">Join a community that spans the globe.</p>

      <form onSubmit={onSubmit} className="mt-6" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" name="displayName" autoComplete="name" placeholder="Aiko Tanaka" maxLength={50} required />
            <FieldError>{fieldErrors.displayName?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" autoComplete="username" placeholder="aiko" maxLength={24} required />
            <FieldError>{fieldErrors.username?.[0]}</FieldError>
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
          <FieldError>{fieldErrors.email?.[0]}</FieldError>
        </div>

        <div className="mt-4">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 10 characters"
              required
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-faint hover:text-ink"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-[11.5px] text-ink-faint">At least 10 characters, including a letter and a number.</p>
          <FieldError>{fieldErrors.password?.[0]}</FieldError>
        </div>

        <div className="mt-4">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input id="dateOfBirth" name="dateOfBirth" type="date" max={new Date().toISOString().slice(0, 10)} required />
          <p className="mt-1 text-[11.5px] text-ink-faint">You must be at least 13. Your date of birth is not shown publicly.</p>
          <FieldError>{fieldErrors.dateOfBirth?.[0]}</FieldError>
        </div>

        <label className="mt-5 flex items-start gap-2.5 text-[12px] leading-5 text-ink-muted">
          <input type="checkbox" name="acceptTerms" className="mt-0.5 h-4 w-4 rounded border-line accent-[#8057E8]" />
          <span>
            I agree to the{" "}
            <Link href="/terms" target="_blank" className="font-medium text-brand hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" target="_blank" className="font-medium text-brand hover:underline">
              Privacy Policy
            </Link>
            , and I will follow the Community Guidelines.
          </span>
        </label>
        <FieldError>{fieldErrors.acceptTerms?.[0]}</FieldError>

        {error && <p className="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-[13px] text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" className="mt-5 w-full" loading={pending}>
          Join EVERLINK
        </Button>
      </form>

      <p className="mt-5 text-center text-[13px] text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
