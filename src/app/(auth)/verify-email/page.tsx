import { Suspense } from "react";
import type { Metadata } from "next";
import { VerifyEmailClient } from "./verify-client";

export const metadata: Metadata = { title: "Verify email" };

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="surface-card h-64 animate-pulse" />}>
      <VerifyEmailClient />
    </Suspense>
  );
}
