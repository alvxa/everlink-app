import Link from "next/link";
import { Logo } from "@/components/brand";
import { APP_TAGLINE } from "@/lib/constants";

const GROUPS = [
  {
    title: "Platform",
    links: [
      { label: "Home", href: "/" },
      { label: "Features", href: "/features" },
      { label: "About", href: "/about" },
      { label: "Help Center", href: "/help" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Community Guidelines", href: "/community-guidelines" },
      { label: "Safety & Privacy", href: "/privacy" },
      { label: "Contact", href: "/contact" },
      { label: "Sign in", href: "/login" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/privacy#cookies" },
      { label: "Data Requests", href: "/contact" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm leading-6 text-ink-muted">
              {APP_TAGLINE} A global home for friendships, cultures and conversations.
            </p>
            <p className="mt-4 text-xs text-ink-faint">
              © {new Date().getFullYear()} Everlink. Built for a connected world.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-faint">{group.title}</h3>
                <ul className="space-y-2">
                  {group.links.map((link) => (
                    <li key={`${group.title}-${link.label}`}>
                      <Link href={link.href} className="text-[13px] text-ink-muted transition hover:text-ink">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
