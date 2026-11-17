import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#111827",
        abyss: "#05060f",
        nebula: "#0a0b18",
        iris: "#7c5cff",
        violet: { DEFAULT: "#29204C", deep: "#1d1738" },
        electric: { DEFAULT: "#8057E8", soft: "#a78bfa" },
        ocean: { DEFAULT: "#2799E8", soft: "#60bdf6" },
        mint: { DEFAULT: "#19BFA5", soft: "#5eead4" },
        cloud: "#F4F5FA",
        surface: "hsl(var(--surface))",
        "surface-2": "hsl(var(--surface-2))",
        "surface-3": "hsl(var(--surface-3))",
        ink: "hsl(var(--ink))",
        "ink-muted": "hsl(var(--ink-muted))",
        "ink-faint": "hsl(var(--ink-faint))",
        line: "hsl(var(--line))",
        brand: "hsl(var(--brand))",
        "brand-soft": "hsl(var(--brand-soft))",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        glow: "0 0 40px -12px rgba(128, 87, 232, 0.55)",
        neon: "0 0 0 1px rgba(139,92,246,.22), 0 24px 70px -26px rgba(124,92,255,.65)",
        card: "0 1px 2px rgba(16,24,40,.04), 0 8px 24px -12px rgba(16,24,40,.12)",
        float: "0 24px 60px -24px rgba(17,24,39,.35)",
        glass: "0 24px 80px -46px rgba(0,0,0,.95), inset 0 1px 0 rgba(255,255,255,.06)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "scale-in": { from: { opacity: "0", transform: "scale(.97)" }, to: { opacity: "1", transform: "scale(1)" } },
        "rise-in": { from: { opacity: "0", transform: "translateY(14px) scale(.985)" }, to: { opacity: "1", transform: "translateY(0) scale(1)" } },
        "slide-in": { from: { opacity: "0", transform: "translateX(-12px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        "pulse-soft": { "0%,100%": { opacity: "0.55" }, "50%": { opacity: "1" } },
        orbit: { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } },
        shimmer: { from: { backgroundPosition: "-200% 0" }, to: { backgroundPosition: "200% 0" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
        "glow-pulse": {
          "0%,100%": { opacity: "0.45", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.06)" },
        },
        "gradient-flow": {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(.85)", opacity: "0.7" },
          "70%,100%": { transform: "scale(2.1)", opacity: "0" },
        },
        sheen: { from: { transform: "translateX(-120%)" }, to: { transform: "translateX(240%)" } },
        drift: {
          "0%,100%": { transform: "translate3d(0,0,0)" },
          "50%": { transform: "translate3d(0,-9px,0)" },
        },
      },
      animation: {
        "fade-in": "fade-in .35s ease both",
        "scale-in": "scale-in .2s ease both",
        "rise-in": "rise-in .55s cubic-bezier(.22,.68,.28,1) both",
        "slide-in": "slide-in .5s cubic-bezier(.22,.68,.28,1) both",
        "pulse-soft": "pulse-soft 3s ease-in-out infinite",
        orbit: "orbit 40s linear infinite",
        shimmer: "shimmer 1.8s linear infinite",
        float: "float 7s ease-in-out infinite",
        "glow-pulse": "glow-pulse 6s ease-in-out infinite",
        "gradient-flow": "gradient-flow 9s ease infinite",
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(0,0,.2,1) infinite",
        sheen: "sheen .9s ease",
        drift: "drift 9s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
