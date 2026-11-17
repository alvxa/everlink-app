"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export function Dropdown({
  trigger,
  children,
  align = "right",
  className,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const place = React.useCallback(() => {
    const triggerEl = ref.current;
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const gap = 8;
    const margin = 8;
    const width = menuRef.current?.offsetWidth ?? 200;
    const height = menuRef.current?.offsetHeight ?? 0;

    let left = align === "right" ? rect.right - width : rect.left;
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

    let top = rect.bottom + gap;
    if (height && top + height > window.innerHeight - margin) {
      const above = rect.top - gap - height;
      top = above >= margin ? above : Math.max(margin, window.innerHeight - height - margin);
    }

    setPos({ top, left });
  }, [align]);

  useIsoLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    place();
    const frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, [open, place]);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onReposition = () => place();
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    document.addEventListener("scroll", onReposition, { passive: true, capture: true });
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", onReposition, { capture: true });
      window.removeEventListener("resize", onReposition);
    };
  }, [open, place]);

  const close = () => setOpen(false);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              visibility: pos ? "visible" : "hidden",
              transformOrigin: align === "right" ? "top right" : "top left",
            }}
            className="z-[85] max-h-[calc(100dvh-1rem)] min-w-[200px] animate-scale-in overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-float"
            role="menu"
          >
            {typeof children === "function" ? children(close) : children}
          </div>,
          document.body
        )}
    </div>
  );
}

export function MenuItem({
  children,
  onClick,
  href,
  icon,
  danger,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
  danger?: boolean;
}) {
  const cls = cn(
    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13.5px] font-medium transition",
    danger ? "text-red-600 hover:bg-red-500/10 dark:text-red-400" : "text-ink-muted hover:bg-surface-3 hover:text-ink"
  );
  if (href) {
    return (
      <Link href={href} className={cls} role="menuitem" onClick={onClick}>
        {icon}
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} role="menuitem">
      {icon}
      {children}
    </button>
  );
}

export function MenuDivider() {
  return <div className="my-1 border-t border-line" />;
}
