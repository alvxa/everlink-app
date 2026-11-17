"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { INTERESTS, LANGUAGES } from "@/lib/constants";
import { COUNTRIES } from "@/lib/countries";

export function ExploreFilters({
  q,
  interest,
  language,
  country,
  sort,
}: {
  q?: string;
  interest?: string;
  language?: string;
  country?: string;
  sort?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(Boolean(interest || language || country || (sort && sort !== "popular")));

  function update(key: string, value: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const next = { interest, language, country, sort, [key]: value || undefined };
    if (next.interest) params.set("interest", next.interest);
    if (next.language) params.set("language", next.language);
    if (next.country) params.set("country", next.country);
    if (next.sort && next.sort !== "popular") params.set("sort", next.sort);
    router.push(`/explore?${params.toString()}`);
  }

  return (
    <div className="surface-card p-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 text-[13px] font-semibold text-ink-muted hover:text-ink"
      >
        <SlidersHorizontal className="h-4 w-4" /> Filters
        <span className="ml-auto text-[11.5px] font-normal text-ink-faint">
          {[interest, language, country].filter(Boolean).length || "none"} active
        </span>
      </button>
      {open && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">Interest</span>
            <select
              value={interest ?? ""}
              onChange={(event) => update("interest", event.target.value)}
              className="h-9 w-full rounded-lg border border-line bg-surface px-2 text-[13px] text-ink outline-none"
            >
              <option value="">Any interest</option>
              {INTERESTS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">Language</span>
            <select
              value={language ?? ""}
              onChange={(event) => update("language", event.target.value)}
              className="h-9 w-full rounded-lg border border-line bg-surface px-2 text-[13px] text-ink outline-none"
            >
              <option value="">Any language</option>
              {LANGUAGES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">Country</span>
            <select
              value={country ?? ""}
              onChange={(event) => update("country", event.target.value)}
              className="h-9 w-full rounded-lg border border-line bg-surface px-2 text-[13px] text-ink outline-none"
            >
              <option value="">Anywhere</option>
              {COUNTRIES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">Sort</span>
            <select
              value={sort ?? "popular"}
              onChange={(event) => update("sort", event.target.value)}
              className="h-9 w-full rounded-lg border border-line bg-surface px-2 text-[13px] text-ink outline-none"
            >
              <option value="popular">Most followed</option>
              <option value="recent">Recently active</option>
              <option value="new">Newest members</option>
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
