import { describe, expect, it } from "vitest";
import { absoluteUrl, ageFromDob, flagEmoji, initials, sanitizeText, slugify, timeAgo } from "@/lib/utils";

describe("slugify", () => {
  it("lowercases, strips accents and separates words", () => {
    expect(slugify("São Paulo Creatives")).toBe("sao-paulo-creatives");
    expect(slugify("  Café / Night  ")).toBe("cafe-night");
  });

  it("caps slugs at 48 characters and never leaves a trailing dash", () => {
    const slug = slugify("a".repeat(60));
    expect(slug).toHaveLength(48);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("ageFromDob", () => {
  it("does not count a birthday that has not happened yet this year", () => {
    const today = new Date();
    const tomorrow = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate() + 1);
    expect(ageFromDob(tomorrow)).toBe(19);
  });

  it("counts the birthday when it is today", () => {
    const today = new Date();
    const birthday = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate());
    expect(ageFromDob(birthday)).toBe(20);
  });
});

describe("tiny formatting helpers", () => {
  it("builds flag emoji from ISO codes and falls back to a globe", () => {
    expect(flagEmoji("jp")).toBe("🇯🇵");
    expect(flagEmoji(undefined)).toBe("🌐");
    expect(flagEmoji("x")).toBe("🌐");
  });

  it("derives initials from the first two words", () => {
    expect(initials("Aiko Tanaka")).toBe("AT");
    expect(initials("  prince ")).toBe("P");
  });

  it("removes null bytes and trims input", () => {
    expect(sanitizeText("\u0000 hello \u0000")).toBe("hello");
  });

  it("joins absolute URLs without duplicated slashes", () => {
    expect(absoluteUrl("/messages")).toMatch(/\/messages$/);
    expect(absoluteUrl("messages")).toMatch(/\/messages$/);
    expect(absoluteUrl("/messages")).not.toContain("//messages");
  });

  it("renders recent timestamps in compact form", () => {
    expect(timeAgo(new Date())).toBe("just now");
    expect(timeAgo(Date.now() - 5 * 60 * 1000)).toBe("5m");
    expect(timeAgo(Date.now() - 3 * 60 * 60 * 1000)).toBe("3h");
  });
});
