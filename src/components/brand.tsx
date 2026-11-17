import { cn } from "@/lib/utils";

export function LogoMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="everlink-brand" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8057E8" />
          <stop offset="0.55" stopColor="#2799E8" />
          <stop offset="1" stopColor="#19BFA5" />
        </linearGradient>
        <linearGradient id="everlink-glow" x1="10" y1="8" x2="38" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="45" height="45" rx="14" fill="url(#everlink-brand)" />
      <rect x="1.5" y="1.5" width="45" height="45" rx="14" stroke="white" strokeOpacity="0.18" />
      <circle cx="24" cy="24" r="11" stroke="url(#everlink-glow)" strokeWidth="1.6" />
      <ellipse cx="24" cy="24" rx="5.2" ry="11" stroke="white" strokeOpacity="0.7" strokeWidth="1.2" />
      <path d="M13.4 20.5h21.2M13.4 27.5h21.2" stroke="white" strokeOpacity="0.6" strokeWidth="1.2" />
      <circle cx="33.5" cy="15.5" r="3.2" fill="#19BFA5" stroke="#111827" strokeWidth="1.4" />
      <circle cx="14.5" cy="32.5" r="2.6" fill="#F9FAFB" />
      <path d="M16.5 30.8l15-12.3" stroke="#111827" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({
  className,
  size = 34,
  showWordmark = true,
  wordmarkClassName,
}: {
  className?: string;
  size?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showWordmark && (
        <span
          className={cn(
            "bg-gradient-to-r from-[#2a1f56] via-[#7c3aed] to-[#0e7490] bg-clip-text font-display text-[22px] font-bold tracking-[-0.03em] text-transparent dark:from-white dark:via-[#d8b4fe] dark:to-[#7dd3fc]",
            wordmarkClassName
          )}
        >
          everlink<span className="text-mint">.</span>
        </span>
      )}
    </span>
  );
}
