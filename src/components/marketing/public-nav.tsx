"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "About", href: "/about" },
  { label: "Features", href: "/features" },
  { label: "Community", href: "/community-guidelines" },
  { label: "Help", href: "/help" },
];

export function PublicNav({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="app-header sticky top-0 z-50">
      <ScrollProgress />
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Everlink home" className="rounded-lg">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-line bg-white/70 p-1 md:flex dark:border-white/[0.08] dark:bg-white/[0.04]">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition",
                pathname === link.href
                  ? "bg-gradient-to-r from-fuchsia-500/25 to-electric/20 text-white shadow-[0_0_20px_-8px_rgba(192,38,211,.9)]"
                  : "text-ink-muted hover:text-ink"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {signedIn ? (
            <Link href="/home">
              <Button size="sm">Open Everlink</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Join Everlink</Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-surface px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-surface-3 hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {signedIn ? (
              <Link href="/home" className="col-span-2">
                <Button className="w-full">Open Everlink</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    Sign in
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="w-full">Join</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
