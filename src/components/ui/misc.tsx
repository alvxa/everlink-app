import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-ink-faint", className)} aria-label="Loading" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-surface-3", className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-brand-soft text-brand dark:border-white/10 dark:bg-gradient-to-br dark:from-fuchsia-500/20 dark:via-electric/15 dark:to-ocean/15 dark:text-[#e9d5ff] dark:shadow-[0_0_30px_-12px_rgba(192,38,211,.9)]">
          {icon}
        </div>
      )}
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-[13.5px] leading-6 text-ink-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function TabNav({
  items,
  active,
  className,
}: {
  items: { label: string; href: string; count?: number }[];
  active: string;
  className?: string;
}) {
  return (
    <div className={cn("hide-scrollbar flex gap-1 overflow-x-auto", className)} role="tablist">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          role="tab"
          aria-selected={active === item.label}
          className={cn(
            "relative shrink-0 rounded-xl border px-3.5 py-2 text-[13.5px] font-semibold transition",
            active === item.label
              ? "border-fuchsia-400/40 bg-gradient-to-r from-fuchsia-500/10 via-electric/10 to-ocean/10 text-brand shadow-[0_6px_18px_-14px_rgba(124,58,237,.5)] dark:from-fuchsia-500/25 dark:via-electric/20 dark:to-ocean/15 dark:text-white dark:shadow-[0_0_24px_-10px_rgba(192,38,211,.95)]"
              : "border-transparent text-ink-muted hover:bg-surface-3/70 hover:text-ink dark:hover:bg-white/[0.06]"
          )}
        >
          {item.label}
          {typeof item.count === "number" && (
            <span className="ml-1.5 text-[11px] font-bold text-ink-faint">{item.count}</span>
          )}
        </Link>
      ))}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}
