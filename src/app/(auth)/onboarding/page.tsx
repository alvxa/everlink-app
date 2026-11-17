import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/onboarding");
  if (user.onboardedAt) redirect("/home");

  const [interests, languages] = await Promise.all([
    db.userInterest.findMany({ where: { userId: user.id }, select: { name: true } }),
    db.userLanguage.findMany({ where: { userId: user.id }, select: { code: true } }),
  ]);

  return (
    <div className="w-full max-w-md">
      <OnboardingForm
        initial={{
          displayName: user.profile?.displayName ?? "",
          bio: user.profile?.bio ?? "",
          avatarUrl: user.profile?.avatarUrl ?? null,
          countryCode: user.profile?.countryCode ?? null,
          interests: interests.map((i) => i.name),
          languages: languages.map((l) => l.code),
          discoverable: user.settings?.discoverable ?? true,
          showCountry: user.settings?.showCountry ?? true,
        }}
      />
      <p className="mt-4 text-center text-[12px] text-ink-faint">
        You can change all of this later in Settings.{" "}
        <Link href="/privacy" className="text-brand hover:underline">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
