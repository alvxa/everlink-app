import Link from "next/link";
import { Globe2, Languages, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { AmbientField } from "@/components/ui/ambient-field";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mesh-bg relative isolate min-h-dvh overflow-hidden bg-surface-2">
      <AmbientField />
      <div className="pointer-events-none absolute -left-40 top-10 h-[420px] w-[420px] rounded-full bg-fuchsia-400/10 blur-[120px] motion-safe:animate-glow-pulse dark:bg-fuchsia-500/15" aria-hidden />
      <div
        className="pointer-events-none absolute -right-32 bottom-0 h-[460px] w-[460px] rounded-full bg-electric/10 blur-[130px] motion-safe:animate-glow-pulse dark:bg-electric/15"
        style={{ animationDelay: "1.6s" }}
        aria-hidden
      />
      <span className="twinkle left-[18%] top-[22%] h-1 w-1" aria-hidden />
      <span className="twinkle left-[72%] top-[16%] h-1.5 w-1.5" style={{ animationDelay: "1.3s" }} aria-hidden />

      <header className="app-header sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Everlink home">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/"
              className="hidden rounded-full border border-line bg-surface/70 px-3 py-1.5 text-[12.5px] font-semibold text-ink-muted transition hover:border-brand/40 hover:text-ink sm:block dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-electric/40"
            >
              Back to home
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto grid max-w-5xl items-center gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:pt-14">
        <aside className="hidden lg:block">
          <Badge variant="neon" className="mb-5 px-3 py-1">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,.6)] dark:bg-fuchsia-300 dark:shadow-[0_0_8px_rgba(240,171,252,.9)]" />
            Connect Beyond Boundaries
          </Badge>
          <h1 className="text-balance font-display text-[44px] font-bold leading-[1.06] tracking-[-0.035em] text-ink">
            One world.
            <br />
            Different cultures.
            <br />
            <span className="gradient-text">Unlimited connections.</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-7 text-ink-muted">
            Meet people from around the world, share your moments and build friendships that cross borders.
          </p>
          <div className="mt-8 space-y-2.5">
            {[
              { icon: Globe2, text: "Discover people and cultures around the world", tone: "from-fuchsia-500/12 text-fuchsia-600 dark:from-fuchsia-500/24 dark:text-fuchsia-300" },
              { icon: Languages, text: "Break language barriers with on-demand translation", tone: "from-electric/12 text-electric dark:from-electric/24 dark:text-[#a5b4fc]" },
              { icon: ShieldCheck, text: "Privacy controls, blocking and human moderation", tone: "from-mint/12 text-[#0f9488] dark:from-mint/20 dark:text-mint" },
              { icon: Sparkles, text: "Communities, moments and live rooms built in", tone: "from-ocean/12 text-ocean dark:from-ocean/24 dark:text-[#7dd3fc]" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.text} className="flex items-center gap-3 text-[13.5px] text-ink-muted">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-gradient-to-br to-transparent dark:border-white/10 ${item.tone}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  {item.text}
                </div>
              );
            })}
          </div>
        </aside>
        <div className="w-full max-w-md justify-self-center lg:justify-self-end">{children}</div>
      </main>
    </div>
  );
}
