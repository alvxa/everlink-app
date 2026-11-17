import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.onboardedAt ? "/home" : "/onboarding");
  const smtpHost = process.env.SMTP_HOST;
  const localMailboxUrl =
    smtpHost === "127.0.0.1" || smtpHost === "localhost" ? `http://${smtpHost}:8025` : undefined;
  return (
    <Suspense fallback={null}>
      <LoginForm
        showDemoAccounts={process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true"}
        localMailboxUrl={localMailboxUrl}
      />
    </Suspense>
  );
}
