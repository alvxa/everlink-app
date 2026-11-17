"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, MailCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch, errorMessage } from "@/lib/client";

type Status = "verifying" | "success" | "error" | "idle";

export function VerifyEmailClient() {
  const params = useSearchParams();
  const token = params.get("token");
  const required = params.get("required") === "1";
  const [status, setStatus] = React.useState<Status>(token ? "verifying" : "idle");
  const [message, setMessage] = React.useState<string | null>(null);
  const [resendState, setResendState] = React.useState<"idle" | "sending" | "sent" | "error">("idle");
  const [manualLink, setManualLink] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        await apiFetch("/api/v1/auth/verify-email", { method: "POST", json: { token } });
        if (!cancelled) setStatus("success");
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setMessage(errorMessage(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function resend() {
    setResendState("sending");
    try {
      const data = await apiFetch<{ alreadyVerified?: boolean; manualVerificationUrl?: string | null }>(
        "/api/v1/auth/resend-verification",
        { method: "POST" }
      );
      if (data.alreadyVerified) {
        setStatus("success");
        return;
      }
      setResendState("sent");
      setManualLink(data.manualVerificationUrl ?? null);
    } catch {
      setResendState("error");
    }
  }

  if (status === "verifying") {
    return (
      <div className="surface-card p-8 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-line border-t-electric" />
        <p className="mt-4 text-sm text-ink-muted">Verifying your email...</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="surface-card p-6 text-center sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-mint/10 text-mint">
          <BadgeCheck className="h-7 w-7" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-ink">Email verified</h1>
        <p className="mt-2 text-[13.5px] leading-6 text-ink-muted">
          Your account is fully activated. You can now post, comment, message and join communities.
        </p>
        <Link href="/home" className="mt-6 inline-block">
          <Button>Go to Everlink</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="surface-card p-6 text-center sm:p-8">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        {status === "error" ? <TriangleAlert className="h-7 w-7 text-amber-500" /> : <MailCheck className="h-7 w-7" />}
      </div>
      <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-ink">
        {status === "error" ? "Verification failed" : "Verify your email"}
      </h1>
      <p className="mt-2 text-[13.5px] leading-6 text-ink-muted">
        {status === "error"
          ? message
          : required
            ? "Verify your email address to unlock posting, commenting, messaging and communities."
            : "Open the verification link we sent to your email. If you are already signed in, you can request a new link below."}
      </p>

      {resendState === "sent" ? (
        <div className="mt-5 rounded-xl bg-mint/10 p-4 text-left text-[12.5px] leading-5 text-ink">
          <p className="font-semibold">A new verification link has been generated.</p>
          <p className="mt-1 text-ink-muted">
            If SMTP is configured, check your inbox. Otherwise email delivery is unavailable on this server, so use the
            one-time link below to activate the account.
          </p>
          {manualLink && (
            <Link href={manualLink} className="mt-2 block break-all font-medium text-brand hover:underline">
              {manualLink}
            </Link>
          )}
        </div>
      ) : (
        <Button className="mt-6 w-full" onClick={resend} loading={resendState === "sending"}>
          Resend verification email
        </Button>
      )}
      {resendState === "error" && (
        <p className="mt-3 text-[12.5px] text-red-600 dark:text-red-400">
          Could not resend. Make sure you are signed in, then try again.
        </p>
      )}

      <div className="mt-5 flex justify-center gap-4 text-[12.5px] font-medium text-ink-muted">
        <Link href="/home" className="hover:text-ink">
          Go to app
        </Link>
        <Link href="/login" className="hover:text-ink">
          Sign in
        </Link>
      </div>
    </div>
  );
}
