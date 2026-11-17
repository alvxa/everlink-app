"use client";

import * as React from "react";
import { CheckCircle2, Info, TriangleAlert, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info" | "warning";
type ToastItem = { id: number; title: string; description?: string; variant: ToastVariant };

type Listener = (toast: ToastItem) => void;
const listeners = new Set<Listener>();
let counter = 0;

export function toast(input: { title: string; description?: string; variant?: ToastVariant }) {
  const item: ToastItem = {
    id: ++counter,
    title: input.title,
    description: input.description,
    variant: input.variant ?? "info",
  };
  listeners.forEach((listener) => listener(item));
  return item.id;
}

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: TriangleAlert,
};

const STYLES = {
  success: "text-mint",
  error: "text-red-500",
  info: "text-ocean",
  warning: "text-amber-500",
};

export function Toaster() {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  React.useEffect(() => {
    const listener: Listener = (item) => {
      setItems((prev) => [...prev.slice(-3), item]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== item.id));
      }, 5000);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end"
    >
      {items.map((item) => {
        const Icon = ICONS[item.variant];
        return (
          <div
            key={item.id}
            className="pointer-events-auto flex w-full max-w-sm animate-scale-in items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-float"
          >
            <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", STYLES[item.variant])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{item.title}</p>
              {item.description && <p className="mt-0.5 text-[13px] leading-5 text-ink-muted">{item.description}</p>}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setItems((prev) => prev.filter((t) => t.id !== item.id))}
              className="rounded-lg p-1 text-ink-faint transition hover:bg-surface-3 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
