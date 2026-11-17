"use client";

import * as React from "react";
import { cn, initials } from "@/lib/utils";

const PALETTES = [
  "from-[#8057E8] to-[#2799E8]",
  "from-[#2799E8] to-[#19BFA5]",
  "from-[#19BFA5] to-[#8057E8]",
  "from-[#F59E0B] to-[#EF4444]",
  "from-[#EC4899] to-[#8057E8]",
  "from-[#0EA5E9] to-[#6366F1]",
];

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-20 w-20 text-2xl",
  "2xl": "h-28 w-28 text-4xl",
} as const;

function hashName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % PALETTES.length;
}

export function Avatar({
  src,
  name,
  size = "md",
  className,
  online,
  neon = false,
}: {
  src?: string | null;
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
  online?: boolean;
  neon?: boolean;
}) {
  const [failed, setFailed] = React.useState(false);
  const showImage = src && !failed;
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 rounded-full",
        neon &&
          "animate-gradient-flow bg-gradient-to-tr from-fuchsia-500 via-violet-500 to-cyan-400 bg-[length:220%_220%] p-[2px] shadow-[0_0_20px_-6px_rgba(192,38,211,.7)] transition-transform duration-300 hover:scale-[1.03]",
        className
      )}
    >
      <span className={cn("relative inline-flex rounded-full", neon && "bg-surface p-[2px]")}>
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={name}
            onError={() => setFailed(true)}
            className={cn("rounded-full object-cover", !neon && "ring-2 ring-surface", SIZES[size])}
          />
        ) : (
          <span
            aria-label={name}
            className={cn(
              "inline-flex items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white",
              !neon && "ring-2 ring-surface",
              PALETTES[hashName(name)],
              SIZES[size]
            )}
          >
            {initials(name) || "?"}
          </span>
        )}
      </span>
      {online !== undefined && (
        <>
          {online && (
            <span className="pointer-events-none absolute bottom-0 right-0 h-2.5 w-2.5 animate-pulse-ring rounded-full bg-mint/70" />
          )}
          <span
            className={cn(
              "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-surface",
              online ? "bg-mint" : "bg-ink-faint/50"
            )}
            title={online ? "Online" : "Offline"}
          />
        </>
      )}
    </span>
  );
}
