"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function useTheme() {
  const [theme, setThemeState] = React.useState<Theme>("dark");

  React.useEffect(() => {
    const stored = (localStorage.getItem("everlink-theme") as Theme | null) ?? "dark";
    setThemeState(stored);
    applyTheme(stored);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      if ((localStorage.getItem("everlink-theme") as Theme | null) === "system") applyTheme("system");
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const setTheme = React.useCallback((next: Theme) => {
    localStorage.setItem("everlink-theme", next);
    setThemeState(next);
    applyTheme(next);
  }, []);

  return { theme, setTheme };
}

export function ThemeToggle({ className, variant = "icon" }: { className?: string; variant?: "icon" | "full" }) {
  const { theme, setTheme } = useTheme();
  const options: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  if (variant === "full") {
    return (
      <div className={cn("inline-flex rounded-xl border border-line bg-surface p-1", className)}>
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition",
                theme === option.value ? "bg-brand-soft text-brand" : "text-ink-muted hover:text-ink"
              )}
              aria-pressed={theme === option.value}
            >
              <Icon className="h-3.5 w-3.5" />
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  const next: Theme = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink-muted transition hover:text-ink",
        className
      )}
      title={`Theme: ${theme} (click for ${next})`}
      aria-label="Change color theme"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
