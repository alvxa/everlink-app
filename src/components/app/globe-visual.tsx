import { cn } from "@/lib/utils";

export function GlobeVisual({ className }: { className?: string }) {
  return (
    <div className={cn("relative aspect-square w-full", className)} aria-hidden>
      <div className="absolute inset-[14%] animate-glow-pulse rounded-full bg-[radial-gradient(circle,rgba(124,92,255,.55),rgba(56,189,248,.18)_45%,transparent_72%)] opacity-70 blur-2xl dark:opacity-100" />
      <div className="absolute inset-[-2%] animate-orbit rounded-full border border-dashed border-line dark:border-white/10" />
      <div className="absolute inset-[7%] animate-pulse-soft rounded-full border border-line/70 dark:border-white/[0.07]" />

      <svg viewBox="0 0 240 240" className="relative h-full w-full">
        <defs>
          <radialGradient id="globe-fill" cx="34%" cy="28%" r="80%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.95" />
            <stop offset="38%" stopColor="#4c46b8" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#0a0b1c" stopOpacity="0.35" />
          </radialGradient>
          <linearGradient id="globe-line" x1="18" y1="18" x2="222" y2="222" gradientUnits="userSpaceOnUse">
            <stop stopColor="#c4b5fd" />
            <stop offset="0.5" stopColor="#38bdf8" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
          <filter id="globe-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="120" cy="120" r="92" fill="url(#globe-fill)" stroke="url(#globe-line)" strokeOpacity="0.55" />

        <g fill="none" stroke="#c4b5fd" strokeOpacity="0.2" strokeWidth="1">
          <ellipse cx="120" cy="120" rx="92" ry="30" />
          <ellipse cx="120" cy="120" rx="92" ry="60" />
          <ellipse cx="120" cy="120" rx="30" ry="92" />
          <ellipse cx="120" cy="120" rx="62" ry="92" />
          <ellipse cx="120" cy="120" rx="88" ry="92" />
        </g>

        <path
          d="M52 96c18-10 34 6 52 0s26-22 44-18 30 20 44 16"
          fill="none"
          stroke="url(#globe-line)"
          strokeOpacity="0.55"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M46 138c22 8 36-8 56-2s30 20 48 14 26-16 42-10"
          fill="none"
          stroke="url(#globe-line)"
          strokeOpacity="0.32"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        <g filter="url(#globe-glow)">
          <circle cx="86" cy="82" r="2.6" fill="#67e8f9" />
          <circle cx="152" cy="104" r="2.2" fill="#c4b5fd" />
          <circle cx="118" cy="150" r="2.4" fill="#5eead4" />
          <circle cx="170" cy="140" r="1.8" fill="#f0abfc" />
        </g>

        <path
          d="M86 82c22 6 46 8 66 22M152 104c-14 16-26 30-34 46"
          fill="none"
          stroke="#e9d5ff"
          strokeOpacity="0.5"
          strokeWidth="0.9"
          strokeDasharray="3 4"
        />
      </svg>

      <span className="absolute left-[6%] top-[46%] h-2 w-2 animate-pulse-soft rounded-full bg-cyan-300 shadow-[0_0_16px_5px_rgba(34,211,238,.65)]" />
      <span className="absolute right-[10%] top-[22%] h-1.5 w-1.5 animate-pulse-soft rounded-full bg-fuchsia-300 shadow-[0_0_14px_4px_rgba(232,121,249,.6)]" style={{ animationDelay: "1.2s" }} />
    </div>
  );
}
