"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Compass,
  Globe2,
  Home,
  LayoutDashboard,
  MessageSquare,
  PenLine,
  Plus,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Timer,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dropdown, MenuItem } from "@/components/ui/dropdown";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/brand";
import { AmbientField } from "@/components/ui/ambient-field";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { apiFetch } from "@/lib/client";
import { cn } from "@/lib/utils";

export type ShellUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  verified: boolean;
};

const PRIMARY_NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/world", label: "World", icon: Globe2 },
  { href: "/connect", label: "Connect", icon: Shuffle },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/communities", label: "Communities", icon: Users },
  { href: "/live", label: "Live rooms", icon: Radio },
  { href: "/moments", label: "Moments", icon: Timer },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

const MOBILE_NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/connect", label: "Connect", icon: Shuffle },
  { href: "/messages", label: "Chats", icon: MessageSquare },
  { href: "/notifications", label: "Alerts", icon: Bell },
];

function isActive(pathname: string, href: string) {
  if (href === "/home") return pathname === "/home";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  user,
  unreadNotifications,
  unreadMessages,
  rail,
  children,
}: {
  user: ShellUser;
  unreadNotifications: number;
  unreadMessages: number;
  rail?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [signingOut, setSigningOut] = React.useState(false);
  const [notificationCount, setNotificationCount] = React.useState(unreadNotifications);
  const [messageCount, setMessageCount] = React.useState(unreadMessages);
  const staff = user.role === "ADMIN" || user.role === "MODERATOR";
  const isMessages = pathname.startsWith("/messages");
  const showRail =
    Boolean(rail) &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/messages") &&
    !pathname.startsWith("/settings");

  React.useEffect(() => {
    document.querySelector<HTMLElement>("[data-app-scroll]")?.scrollTo({ top: 0 });
  }, [pathname]);

  React.useEffect(() => {
    setNotificationCount(unreadNotifications);
    setMessageCount(unreadMessages);
  }, [unreadNotifications, unreadMessages]);

  React.useEffect(() => {
    const onNotification = () => setNotificationCount((count) => count + 1);
    const onMessage = () => {
      if (window.location.pathname.startsWith("/messages")) return;
      setMessageCount((count) => count + 1);
    };
    const onReadNotifications = () => setNotificationCount(0);
    const onSetNotifications = (event: Event) => {
      const count = (event as CustomEvent<{ count?: number }>).detail?.count;
      if (typeof count === "number") setNotificationCount(count);
    };
    const onMessagesRead = (event: Event) => {
      const closed = (event as CustomEvent<{ count?: number }>).detail?.count ?? 1;
      setMessageCount((count) => Math.max(0, count - closed));
    };
    window.addEventListener("everlink:notification", onNotification);
    window.addEventListener("everlink:message", onMessage);
    window.addEventListener("everlink:notifications-read", onReadNotifications);
    window.addEventListener("everlink:notifications-set", onSetNotifications);
    window.addEventListener("everlink:messages-read", onMessagesRead);
    return () => {
      window.removeEventListener("everlink:notification", onNotification);
      window.removeEventListener("everlink:message", onMessage);
      window.removeEventListener("everlink:notifications-read", onReadNotifications);
      window.removeEventListener("everlink:notifications-set", onSetNotifications);
      window.removeEventListener("everlink:messages-read", onMessagesRead);
    };
  }, []);

  async function signOut() {
    setSigningOut(true);
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    router.push(`/explore?q=${encodeURIComponent(value)}`);
    setQuery("");
  }

  const badgeFor = (href: string) =>
    href === "/notifications" ? notificationCount : href === "/messages" ? messageCount : 0;

  return (
    <div className="relative isolate min-h-dvh bg-surface-2">
      <AmbientField />
      <ScrollReveal />
      <aside className="app-sidebar dark fixed inset-y-0 left-0 z-50 hidden w-[268px] flex-col px-4 py-6 backdrop-blur-2xl lg:flex">
        <Link href="/home" className="px-2" aria-label="Everlink home">
          <Logo size={34} />
        </Link>

        <nav className="mt-8 flex flex-1 flex-col gap-0.5 overflow-y-auto pr-1" aria-label="Main navigation">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const badge = badgeFor(item.href);
            return (
              <Link key={item.href} href={item.href} className="sidebar-item" data-active={active}>
                <item.icon className="h-[20px] w-[20px]" strokeWidth={active ? 2.4 : 2} />
                <span>{item.label}</span>
                {badge > 0 && (
                  <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-electric to-ocean px-1.5 py-0.5 text-[10px] font-bold text-white shadow-glow">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="my-2 h-px bg-line/70" />

          <Link
            href={`/profile/${user.username}`}
            className="sidebar-item"
            data-active={isActive(pathname, `/profile/${user.username}`)}
          >
            <UserRound className="h-[20px] w-[20px]" />
            <span>Profile</span>
          </Link>
          <Link href="/settings" className="sidebar-item" data-active={isActive(pathname, "/settings")}>
            <Settings className="h-[20px] w-[20px]" />
            <span>Settings</span>
          </Link>
          {staff && (
            <Link href="/admin" className="sidebar-item" data-active={isActive(pathname, "/admin")}>
              <LayoutDashboard className="h-[20px] w-[20px]" />
              <span>Admin</span>
            </Link>
          )}
        </nav>

        <div className="mt-4 space-y-3">
          <div className="glass-sheen relative overflow-hidden rounded-2xl border border-electric/25 bg-gradient-to-br from-electric/25 via-[#141634] to-ocean/15 p-4 shadow-[0_18px_50px_-32px_rgba(139,92,246,.9)]">
            <div className="pointer-events-none absolute -right-7 -top-8 h-24 w-24 rounded-full bg-electric/40 blur-2xl" />
            <p className="relative flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-faint">
              <Sparkles className="h-3 w-3 text-brand" /> Find your people
            </p>
            <p className="relative mt-1.5 text-[12.5px] leading-5 text-ink-muted">
              Join a community, start a live room, or meet someone new.
            </p>
            <Link
              href="/explore"
              className="relative mt-3 inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-ink ring-1 ring-white/15 transition hover:bg-white/20"
            >
              Explore now <Plus className="h-3 w-3" />
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <div className="flex items-center gap-2.5">
              <Avatar src={user.avatarUrl} name={user.displayName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink">{user.displayName}</p>
                <p className="truncate text-[11px] text-ink-faint">@{user.username}</p>
              </div>
              <ThemeToggle />
            </div>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="mt-2.5 w-full rounded-xl border border-line/70 py-1.5 text-[12px] font-semibold text-ink-muted transition hover:border-line hover:text-ink disabled:opacity-50"
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      </aside>

      <div className="min-h-dvh lg:pl-[268px]">
        <header className="app-header sticky top-0 z-40">
          <ScrollProgress />
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <Link href="/home" className="lg:hidden" aria-label="Everlink home">
              <Logo size={28} />
            </Link>

            <form onSubmit={submitSearch} className="relative hidden min-w-0 flex-1 items-center sm:flex lg:max-w-[560px]">
              <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-ink-faint" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search people, posts, communities..."
                aria-label="Search Everlink"
                className="h-10 w-full rounded-2xl border border-line bg-surface-2/70 pl-10 pr-14 text-[13.5px] text-ink outline-none transition placeholder:text-ink-faint focus:border-electric/50 focus:bg-surface-2 dark:border-white/10 dark:bg-white/[0.045] dark:focus:border-electric/60 dark:focus:bg-white/[0.07] dark:focus:shadow-[0_0_30px_-14px_rgba(139,92,246,.9)]"
              />
              <kbd className="pointer-events-none absolute right-3 rounded-md border border-line/80 px-1.5 py-0.5 text-[10px] font-semibold text-ink-faint">
                Enter
              </kbd>
            </form>

            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <ThemeToggle className="lg:hidden" />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Search"
                className="sm:hidden"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-[19px] w-[19px]" />
              </Button>

              <Dropdown
                align="right"
                trigger={
                  <Button size="sm" className="hidden shadow-glow sm:inline-flex">
                    <PenLine className="h-4 w-4" /> Create
                  </Button>
                }
              >
                {(close) => (
                  <div className="w-56" onClick={close}>
                    <MenuItem href="/home" icon={<PenLine className="h-4 w-4" />}>
                      New post
                    </MenuItem>
                    <MenuItem href="/moments?compose=1" icon={<Timer className="h-4 w-4" />}>
                      New moment
                    </MenuItem>
                    <MenuItem href="/live" icon={<Radio className="h-4 w-4" />}>
                      Start a live room
                    </MenuItem>
                    <MenuItem href="/communities" icon={<Users className="h-4 w-4" />}>
                      Create a community
                    </MenuItem>
                  </div>
                )}
              </Dropdown>

              <Link
                href="/notifications"
                aria-label={`Notifications${notificationCount > 0 ? `, ${notificationCount} unread` : ""}`}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface-2/70 text-ink-muted transition hover:border-brand/40 hover:text-ink dark:border-white/10 dark:bg-white/[0.045] dark:hover:border-electric/40 dark:hover:text-white dark:hover:shadow-[0_0_22px_-10px_rgba(139,92,246,.9)]"
              >
                <Bell className="h-[18px] w-[18px]" />
                {notificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-1 text-[9.5px] font-bold text-white ring-2 ring-surface">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                )}
              </Link>

              <Dropdown
                trigger={
                  <button
                    aria-label="Account menu"
                    className="rounded-full ring-2 ring-transparent transition hover:ring-electric/40"
                  >
                    <Avatar src={user.avatarUrl} name={user.displayName} size="sm" neon />
                  </button>
                }
              >
                {(close) => (
                  <div className="w-56">
                    <MenuItem href={`/profile/${user.username}`} icon={<UserRound className="h-4 w-4" />}>
                      My profile
                    </MenuItem>
                    <MenuItem href="/settings" icon={<Settings className="h-4 w-4" />}>
                      Settings
                    </MenuItem>
                    {staff && (
                      <MenuItem href="/admin" icon={<ShieldCheck className="h-4 w-4" />}>
                        Admin dashboard
                      </MenuItem>
                    )}
                    <MenuItem danger onClick={() => { close(); void signOut(); }}>
                      {signingOut ? "Signing out..." : "Sign out"}
                    </MenuItem>
                  </div>
                )}
              </Dropdown>
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1420px] gap-6">
          <main
            data-app-scroll
            className={cn(
              "w-full min-w-0 flex-1 overscroll-contain",
              isMessages
                ? "h-[calc(100dvh-4rem-4rem)] overflow-hidden lg:h-[calc(100dvh-4rem)]"
                : "h-[calc(100dvh-4rem-4rem)] overflow-y-auto px-0 pb-6 lg:h-[calc(100dvh-4rem)] lg:pb-10"
            )}
          >
            {children}
          </main>

          {showRail && (
            <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-[320px] shrink-0 overflow-y-auto pb-8 pl-2 pr-4 pt-5 xl:block">
              {rail}
            </aside>
          )}
        </div>
      </div>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line glass pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1.5">
          {MOBILE_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const badge = badgeFor(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10.5px] font-medium transition",
                  active ? "text-brand dark:text-[#d8b4fe]" : "text-ink-faint"
                )}
              >
                {active && (
                  <>
                    <span className="absolute inset-x-1 inset-y-0.5 -z-10 rounded-xl bg-gradient-to-t from-electric/25 to-transparent ring-1 ring-inset ring-electric/25" />
                    <span className="absolute -top-1.5 h-0.5 w-6 rounded-full bg-gradient-to-r from-fuchsia-400 to-ocean shadow-[0_0_10px_rgba(167,139,250,.9)]" />
                  </>
                )}
                <item.icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.4 : 2} />
                {item.label}
                {badge > 0 && (
                  <span className="unread-pulse absolute right-1 top-0.5 min-w-4 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-1 text-center text-[9px] font-bold leading-4 text-white">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
          <Link
            href="/settings"
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10.5px] font-medium",
              isActive(pathname, "/settings") ? "text-brand" : "text-ink-faint"
            )}
          >
            <Settings className="h-[21px] w-[21px]" />
            Settings
          </Link>
        </div>
      </nav>

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </div>
  );
}

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-abyss/70 px-4 pt-24 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-line/80 bg-surface p-3 shadow-float">
        <form onSubmit={submit} className="flex items-center gap-2">
          <Search className="ml-2 h-4 w-4 text-ink-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people, posts, communities..."
            className="h-10 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-faint"
          />
          <button type="button" onClick={onClose} aria-label="Close search" className="rounded-lg p-2 text-ink-faint hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </form>
        <div className="mt-2 flex items-center gap-2 border-t border-line pt-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => router.push("/explore?tab=people")}>
            <Plus className="h-3.5 w-3.5" /> Find people
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => router.push("/communities")}>
            <Users className="h-3.5 w-3.5" /> Browse communities
          </Button>
        </div>
      </div>
    </div>
  );
}
