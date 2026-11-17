"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, KeyRound, LogIn, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { apiFetch, errorMessage } from "@/lib/client";
import { cn, safeNext } from "@/lib/utils";

type Mode = "password" | "email";

export function LoginForm({
  showDemoAccounts = false,
  localMailboxUrl,
}: {
  showDemoAccounts?: boolean;
  localMailboxUrl?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"), "/home");
  const [step, setStep] = React.useState<"credentials" | "2fa">("credentials");
  const [mode, setMode] = React.useState<Mode>("password");
  const [showPassword, setShowPassword] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  const [codeEmail, setCodeEmail] = React.useState("");
  const [codeSent, setCodeSent] = React.useState(false);
  const [codeBusy, setCodeBusy] = React.useState(false);
  const [codeError, setCodeError] = React.useState<string | null>(null);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function go(data: { requires2fa?: boolean; user?: { onboarded?: boolean } }) {
    if (data.requires2fa) {
      setStep("2fa");
      return;
    }
    router.push(data.user?.onboarded ? next : "/onboarding");
    router.refresh();
  }

  async function onLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      const data = await apiFetch<{ requires2fa?: boolean; user?: { onboarded?: boolean } }>("/api/v1/auth/login", {
        method: "POST",
        json: { email: String(form.get("email") || ""), password: String(form.get("password") || "") },
      });
      go(data);
    } catch (err) {
      const e = err as { details?: Record<string, string[]> };
      setFieldErrors(e.details ?? {});
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function requestCode(email: string) {
    setCodeBusy(true);
    setCodeError(null);
    try {
      await apiFetch("/api/v1/auth/email-code/request", { method: "POST", json: { email } });
      setCodeEmail(email);
      setCodeSent(true);
      setCooldown(30);
    } catch (err) {
      setCodeError(errorMessage(err));
    } finally {
      setCodeBusy(false);
    }
  }

  async function onRequestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await requestCode(String(form.get("email") || "").trim());
  }

  async function onVerifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setCodeBusy(true);
    setCodeError(null);
    try {
      const data = await apiFetch<{ requires2fa?: boolean; user?: { onboarded?: boolean } }>(
        "/api/v1/auth/email-code/verify",
        { method: "POST", json: { email: codeEmail, code: String(form.get("code") || "") } }
      );
      go(data);
    } catch (err) {
      setCodeError(errorMessage(err));
    } finally {
      setCodeBusy(false);
    }
  }

  async function onVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const data = await apiFetch<{ user?: { onboarded?: boolean } }>("/api/v1/auth/2fa/challenge", {
        method: "POST",
        json: { code: String(form.get("code") || "") },
      });
      router.push(data.user?.onboarded ? next : "/onboarding");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  if (step === "2fa") {
    return (
      <div className="surface-card relative overflow-hidden p-6 sm:p-8">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/70 to-transparent" />
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-brand-soft text-brand dark:border-white/10 dark:bg-gradient-to-br dark:from-fuchsia-500/25 dark:to-electric/20 dark:text-fuchsia-200 dark:shadow-[0_0_28px_-10px_rgba(192,38,211,.9)]">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Two-factor verification</h1>
        <p className="mt-1.5 text-[13.5px] leading-6 text-ink-muted">
          Enter the 6-digit code from your authenticator app, or one of your recovery codes.
        </p>
        <form onSubmit={onVerify} className="mt-6">
          <Label htmlFor="code">Authentication code</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="123456"
            maxLength={12}
            required
            className="text-center text-xl tracking-[0.4em]"
          />
          {error && <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-[13px] text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" className="mt-5 w-full" loading={pending}>
            Verify and continue
          </Button>
          <button
            type="button"
            onClick={() => {
              setStep("credentials");
              setError(null);
            }}
            className="mt-3 w-full text-center text-[12.5px] font-medium text-ink-muted hover:text-ink"
          >
            Back to sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="surface-card conic-border relative overflow-hidden p-6 sm:p-8">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/70 to-transparent" />
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-brand-soft text-brand dark:border-white/10 dark:bg-gradient-to-br dark:from-fuchsia-500/25 dark:via-electric/20 dark:to-ocean/20 dark:text-[#e9d5ff] dark:shadow-[0_0_28px_-10px_rgba(192,38,211,.9)]">
        <LogIn className="h-6 w-6" />
      </div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Welcome back</h1>
      <p className="mt-1.5 text-[13.5px] leading-6 text-ink-muted">Sign in to reconnect with your world.</p>

      <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface-2 p-1">
        {(
          [
            { key: "password", label: "Password", icon: KeyRound },
            { key: "email", label: "Email code", icon: Mail },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            aria-pressed={mode === tab.key}
            onClick={() => {
              setMode(tab.key);
              setError(null);
              setCodeError(null);
            }}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold transition",
              mode === tab.key
                ? "bg-surface text-ink shadow-sm ring-1 ring-line"
                : "text-ink-muted hover:text-ink"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {mode === "password" ? (
        <form onSubmit={onLogin} className="mt-5" noValidate>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
            <FieldError>{fieldErrors.email?.[0]}</FieldError>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-[12px] font-medium text-brand hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Your password"
                required
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-faint hover:text-ink"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <FieldError>{fieldErrors.password?.[0]}</FieldError>
          </div>

          {error && <p className="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-[13px] text-red-600 dark:text-red-400">{error}</p>}

          <Button type="submit" className="mt-5 w-full" loading={pending}>
            <KeyRound className="h-4 w-4" /> Sign in
          </Button>
        </form>
      ) : codeSent ? (
        <form onSubmit={onVerifyCode} className="mt-5">
          <p className="rounded-xl bg-mint/10 px-3 py-2.5 text-[12.5px] leading-5 text-ink">
            If an account exists for <span className="font-semibold">{codeEmail}</span>, a 6-digit code is on its way. It
            expires in 10 minutes.
          </p>
          {localMailboxUrl && (
            <p className="mt-2 text-[11.5px] leading-5 text-ink-faint">
              Local development: open{" "}
              <a href={localMailboxUrl} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
                the Mailpit inbox
              </a>{" "}
              to read the code.
            </p>
          )}
          <div className="mt-4">
            <Label htmlFor="code">Sign-in code</Label>
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="123456"
              maxLength={6}
              required
              className="text-center text-xl tracking-[0.4em]"
            />
          </div>
          {codeError && <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-[13px] text-red-600 dark:text-red-400">{codeError}</p>}
          <Button type="submit" className="mt-5 w-full" loading={codeBusy}>
            Verify and sign in
          </Button>
          <div className="mt-3 flex items-center justify-between text-[12px] font-medium text-ink-muted">
            <button
              type="button"
              disabled={cooldown > 0 || codeBusy}
              onClick={() => requestCode(codeEmail)}
              className="hover:text-ink disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCodeSent(false);
                setCodeError(null);
              }}
              className="hover:text-ink"
            >
              Change email
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={onRequestCode} className="mt-5" noValidate>
          <p className="text-[12px] leading-5 text-ink-muted">
            No password needed. We will email a one-time 6-digit code.
          </p>
          <div className="mt-3">
            <Label htmlFor="code-email">Email</Label>
            <Input
              id="code-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              onChange={(event) => setCodeEmail(event.target.value)}
            />
          </div>
          {codeError && <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-[13px] text-red-600 dark:text-red-400">{codeError}</p>}
          <Button type="submit" className="mt-5 w-full" loading={codeBusy}>
            <Mail className="h-4 w-4" /> Email me a sign-in code
          </Button>
        </form>
      )}

      <p className="mt-5 text-center text-[13px] text-ink-muted">
        New to Everlink?{" "}
        <Link href="/register" className="font-semibold text-brand hover:underline">
          Create an account
        </Link>
      </p>

      {showDemoAccounts && (
        <div className="mt-6 rounded-xl border border-dashed border-line bg-surface-2 p-3 text-[11.5px] leading-5 text-ink-faint">
          <p className="font-semibold text-ink-muted">Development demo accounts</p>
          <p>Admin: admin@everlink.demo · AdminPass123!</p>
          <p>Member: aiko@everlink.demo · DemoPass123!</p>
        </div>
      )}
    </div>
  );
}
