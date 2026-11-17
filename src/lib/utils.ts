import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(date: Date | string | number): string {
  const d = new Date(date).getTime();
  const seconds = Math.floor((Date.now() - d) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatDate(date: Date | string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(date).toLocaleDateString(undefined, opts ?? { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(date: Date | string) {
  return new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, "")}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function extractHashtags(text: string): string[] {
  const matches = text.match(/(?:^|\s)#([\p{L}\p{N}_]{2,50})/gu) ?? [];
  return Array.from(new Set(matches.map((m) => m.trim().slice(1).toLowerCase()))).slice(0, 20);
}

export function extractMentions(text: string): string[] {
  const matches = text.match(/(?:^|\s)@([a-zA-Z0-9_]{3,24})/g) ?? [];
  return Array.from(new Set(matches.map((m) => m.trim().slice(1).toLowerCase()))).slice(0, 20);
}

export function ageFromDob(dob: Date | string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

/** Random matching is limited to legal age bands: adults with adults only,
 *  minors only with minors within 24 months. */
export function matchingAgeBand(dob: Date | string): "minor" | "adult" {
  return ageFromDob(dob) >= 18 ? "adult" : "minor";
}

export function canRandomMatch(dobA: Date | string, dobB: Date | string): boolean {
  const a = ageFromDob(dobA);
  const b = ageFromDob(dobB);
  if (a >= 18 && b >= 18) return true;
  if (a < 18 && b < 18) return Math.abs(a - b) <= 2;
  return false;
}

export function truncate(text: string, length = 160): string {
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
}

export function safeNext(value: string | null | undefined, fallback = "/home"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function flagEmoji(code?: string | null): string {
  if (!code || code.length !== 2) return "🌐";
  const base = 0x1f1e6;
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((c) => base + (c.charCodeAt(0) - 65))
  );
}

export function absoluteUrl(path: string): string {
  const base = process.env.APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export function sanitizeText(input: string): string {
  return input.replace(/\u0000/g, "").trim();
}

export function parseIdList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((v) => v.trim()).filter(Boolean).slice(0, 50);
}
