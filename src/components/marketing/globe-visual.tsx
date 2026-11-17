import { Languages } from "lucide-react";

export function GlobeVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px]">
      <div className="absolute inset-6 rounded-full bg-electric/20 blur-3xl" aria-hidden />
      <div className="relative h-full w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#0c1224] shadow-float">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(circle at 65% 30%, rgba(39,153,232,.35), transparent 45%), radial-gradient(circle at 30% 75%, rgba(128,87,232,.4), transparent 50%), radial-gradient(circle at 65% 80%, rgba(25,191,165,.25), transparent 45%)",
          }}
        />
        <div className="pointer-events-none absolute left-1/2 top-[52%] h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2" aria-hidden>
          <span className="orbit-ring inset-0" />
          <span className="orbit-ring orbit-ring-reverse inset-[9%]" />
        </div>
        <svg viewBox="0 0 560 560" className="relative h-full w-full" role="img" aria-label="A connected globe representing Everlink's global community">
          <defs>
            <linearGradient id="globe-route" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="55%" stopColor="#60bdf6" />
              <stop offset="100%" stopColor="#5eead4" />
            </linearGradient>
            <radialGradient id="globe-core" cx="38%" cy="32%" r="75%">
              <stop offset="0%" stopColor="#2b2453" />
              <stop offset="60%" stopColor="#161c38" />
              <stop offset="100%" stopColor="#0b1020" />
            </radialGradient>
            <filter id="globe-blur">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>

          <circle cx="280" cy="286" r="174" fill="url(#globe-core)" stroke="rgba(255,255,255,.14)" strokeWidth="1.2" />
          <circle cx="280" cy="286" r="174" fill="none" stroke="rgba(128,87,232,.35)" strokeWidth="10" filter="url(#globe-blur)" opacity=".5" />

          {[0.25, 0.5, 0.75].map((ratio) => (
            <ellipse
              key={`lat-${ratio}`}
              cx="280"
              cy="286"
              rx={174 * Math.sqrt(1 - (ratio - 0.5) * 2 * (ratio - 0.5) * 2) * 0.86}
              ry="9"
              transform={`translate(0 ${(ratio - 0.5) * 348})`}
              fill="none"
              stroke="rgba(255,255,255,.08)"
            />
          ))}
          {[0.35, 0.62, 0.9].map((rx) => (
            <ellipse key={`lon-${rx}`} cx="280" cy="286" rx={174 * rx} ry="174" fill="none" stroke="rgba(255,255,255,.07)" />
          ))}
          <ellipse cx="280" cy="286" rx="174" ry="66" fill="none" stroke="rgba(255,255,255,.12)" transform="rotate(-18 280 286)" />
          <ellipse cx="280" cy="286" rx="174" ry="66" fill="none" stroke="rgba(255,255,255,.06)" transform="rotate(14 280 286)" />

          {/* Connection arcs */}
          <path d="M206 218 Q300 120 392 212" fill="none" stroke="url(#globe-route)" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 9" className="route-path" />
          <path d="M176 338 Q290 420 404 320" fill="none" stroke="url(#globe-route)" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 9" className="route-path" opacity=".8" />
          <path d="M220 250 Q336 290 372 362" fill="none" stroke="url(#globe-route)" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 8" className="route-path" opacity=".65" />

          {/* Nodes */}
          {[
            [206, 218, "#a78bfa"],
            [392, 212, "#60bdf6"],
            [176, 338, "#5eead4"],
            [404, 320, "#60bdf6"],
            [372, 362, "#a78bfa"],
            [268, 300, "#ffffff"],
          ].map(([cx, cy, color], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r="10" fill={String(color)} opacity=".14" />
              <circle cx={cx} cy={cy} r="3.4" fill={String(color)} stroke="#0b1020" strokeWidth="1.4" />
            </g>
          ))}
          <circle cx="268" cy="300" r="18" fill="none" stroke="rgba(255,255,255,.28)" />
          <circle cx="268" cy="300" r="34" fill="none" stroke="rgba(255,255,255,.08)" />

          <path d="M246 306l16-10 14 8 12-16" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1" />
        </svg>

        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/80 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-mint" />
          Global conversations
        </div>

        <div className="pointer-events-none absolute right-[4%] top-[18%] w-[46%] max-w-[185px] rotate-2 rounded-2xl border border-white/10 bg-[#131a30]/85 p-2.5 backdrop-blur-md motion-safe:animate-drift">
          <p className="text-[9px] font-bold uppercase tracking-wider text-white/70">Language bridge</p>
          <p className="mt-1 text-[12px] font-medium leading-4 text-white/90">“Kumusta ka?”</p>
          <div className="my-1 h-px w-full bg-white/15" />
          <p className="text-[11px] leading-4 text-emerald-300">“How are you?”</p>
        </div>

        <div
          className="pointer-events-none absolute bottom-[9%] left-[4%] w-[47%] max-w-[190px] -rotate-2 rounded-2xl border border-white/10 bg-[#131a30]/85 p-2.5 backdrop-blur-md motion-safe:animate-drift"
          style={{ animationDelay: "1.8s" }}
        >
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-white/85">
            <Languages className="h-3.5 w-3.5 shrink-0 text-cyan-300" /> One feed, every language
          </div>
          <p className="mt-1 text-[10px] leading-4 text-white/75">Posts, comments and messages stay readable.</p>
        </div>
      </div>

      <style>{`
        .route-path { animation: routeFlow 7s linear infinite; }
        @keyframes routeFlow { to { stroke-dashoffset: -144; } }
        @media (prefers-reduced-motion: reduce) { .route-path { animation: none; } }
      `}</style>
    </div>
  );
}
