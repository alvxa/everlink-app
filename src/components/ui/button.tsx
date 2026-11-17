import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50 active:scale-[0.985] no-tap-highlight",
  {
    variants: {
      variant: {
        default:
          "sheen-btn bg-gradient-to-r from-[#7c3aed] via-electric to-[#3b82f6] text-white shadow-[0_10px_30px_-12px_rgba(139,92,246,.95)] ring-1 ring-inset ring-white/15 hover:brightness-110",
        secondary: "bg-surface-3 text-ink hover:bg-line/60",
        outline: "border border-line bg-surface text-ink hover:bg-surface-2",
        ghost: "text-ink-muted hover:bg-surface-3 hover:text-ink",
        destructive: "bg-red-500/10 text-red-600 hover:bg-red-500/15 dark:text-red-400",
        mint: "bg-mint text-midnight hover:brightness-105",
        link: "h-auto rounded-none p-0 text-brand underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3.5 text-[13px]",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-10 w-10 p-0",
        "icon-sm": "h-8 w-8 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
);
Button.displayName = "Button";
