"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/communities", label: "Communities" },
  { href: "/admin/moderation", label: "Moderation log" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <div className="hide-scrollbar flex gap-1 overflow-x-auto rounded-2xl border border-line bg-surface p-1.5">
      {LINKS.map((link) => {
        const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "shrink-0 rounded-xl px-3 py-2 text-[12.5px] font-semibold transition",
              active ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-surface-3 hover:text-ink"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
