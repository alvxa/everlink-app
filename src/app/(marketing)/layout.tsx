import { getCurrentUser } from "@/lib/auth";
import { PublicNav } from "@/components/marketing/public-nav";
import { SiteFooter } from "@/components/marketing/footer";
import { AmbientField } from "@/components/ui/ambient-field";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

export const dynamic = "force-dynamic";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-surface-2">
      <AmbientField />
      <ScrollReveal />
      <PublicNav signedIn={Boolean(user)} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
