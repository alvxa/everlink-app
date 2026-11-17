import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-5",
  {
    variants: {
      variant: {
        default: "bg-brand-soft text-brand",
        mint: "bg-mint/10 text-mint",
        ocean: "bg-ocean/10 text-ocean",
        outline: "border border-line text-ink-muted",
        danger: "bg-red-500/10 text-red-600 dark:text-red-400",
        muted: "bg-surface-3 text-ink-muted",
        neon: "border border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-700 dark:border-fuchsia-400/30 dark:bg-fuchsia-500/15 dark:text-fuchsia-200",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
