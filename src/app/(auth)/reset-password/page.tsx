import { Suspense } from "react";
import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="surface-card h-64 animate-pulse" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
