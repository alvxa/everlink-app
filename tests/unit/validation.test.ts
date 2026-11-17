import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  adminReportActionSchema,
  adminSettingsSchema,
  adminUserActionSchema,
  communitySchema,
  messageSchema,
  postSchema,
  registerSchema,
  reportSchema,
  translateSchema,
  usernameSchema,
} from "@/lib/validation";

const twentyYearsAgo = new Date(Date.now() - 20 * 365.25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const tenYearsAgo = new Date(Date.now() - 10 * 365.25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

describe("usernameSchema", () => {
  it("normalises casing and whitespace", () => {
    expect(usernameSchema.parse("  Aiko_Chan ")).toBe("aiko_chan");
  });

  it("rejects spaces, symbols and short names", () => {
    expect(() => usernameSchema.parse("aiko chan")).toThrow();
    expect(() => usernameSchema.parse("aiko!")).toThrow();
    expect(() => usernameSchema.parse("ab")).toThrow();
  });
});

describe("registerSchema", () => {
  it("accepts an adult registration with strong credentials", () => {
    const parsed = registerSchema.parse({
      username: "New_Member",
      displayName: "New Member",
      email: "  MEMBER@Example.COM ",
      password: "correct-horse-9",
      dateOfBirth: twentyYearsAgo,
      acceptTerms: true,
    });
    expect(parsed.username).toBe("new_member");
    expect(parsed.email).toBe("member@example.com");
  });

  it("blocks underage sign-ups", () => {
    const result = registerSchema.safeParse({
      username: "young_member",
      displayName: "Young Member",
      email: "young@example.com",
      password: "correct-horse-9",
      dateOfBirth: tenYearsAgo,
      acceptTerms: true,
    });
    expect(result.success).toBe(false);
  });

  it("requires terms acceptance and a password with letters and numbers", () => {
    expect(
      registerSchema.safeParse({
        username: "member",
        displayName: "Member",
        email: "member@example.com",
        password: "correct-horse-9",
        dateOfBirth: twentyYearsAgo,
        acceptTerms: false,
      }).success
    ).toBe(false);

    expect(
      registerSchema.safeParse({
        username: "member",
        displayName: "Member",
        email: "member@example.com",
        password: "letters-only-password",
        dateOfBirth: twentyYearsAgo,
        acceptTerms: true,
      }).success
    ).toBe(false);
  });
});

describe("postSchema", () => {
  it("requires content", () => {
    expect(postSchema.safeParse({ body: "   " }).success).toBe(false);
  });

  it("accepts an image post and defaults to public visibility", () => {
    const parsed = postSchema.parse({
      body: "",
      media: [{ url: "/api/v1/files/public/a.png", mime: "image/png", type: "image" }],
    });
    expect(parsed.visibility).toBe("PUBLIC");
    expect(parsed.media).toHaveLength(1);
  });

  it("rejects non-http links", () => {
    expect(postSchema.safeParse({ body: "hi", linkUrl: "javascript:alert(1)" }).success).toBe(false);
  });

  it("rejects more than 10 attachments", () => {
    const media = Array.from({ length: 11 }, (_, index) => ({
      url: `/api/v1/files/public/${index}.png`,
      mime: "image/png",
      type: "image" as const,
    }));
    expect(postSchema.safeParse({ body: "album", media }).success).toBe(false);
  });
});

describe("messaging and reports", () => {
  it("does not allow empty messages", () => {
    expect(messageSchema.safeParse({ body: "   ", attachments: [] }).success).toBe(false);
  });

  it("caps attachments per message", () => {
    const attachments = Array.from({ length: 6 }, (_, index) => ({
      url: `/api/v1/files/private/${index}.png`,
      kind: "image" as const,
      mime: "image/png",
      size: 100,
    }));
    expect(messageSchema.safeParse({ body: "", attachments }).success).toBe(false);
  });

  it("only accepts known report targets and reasons", () => {
    expect(reportSchema.safeParse({ targetType: "POST", targetId: "p1", reason: "Spam or misleading content" }).success).toBe(true);
    expect(reportSchema.safeParse({ targetType: "DATABASE", targetId: "p1", reason: "Spam or misleading content" }).success).toBe(false);
    expect(reportSchema.safeParse({ targetType: "POST", targetId: "p1", reason: "I do not like it" }).success).toBe(false);
  });
});

describe("communitySchema", () => {
  it("normalises country codes and rejects unsafe slugs", () => {
    const parsed = communitySchema.parse({ name: "Tokyo Creatives", description: "A place for Tokyo makers.", countryCode: "jp" });
    expect(parsed.countryCode).toBe("JP");
    expect(communitySchema.safeParse({ name: "Bad", description: "short", slug: "Not A Slug" }).success).toBe(false);
  });
});

describe("admin schemas", () => {
  it("whitelists staff actions", () => {
    expect(adminUserActionSchema.safeParse({ action: "MAKE_ADMIN" }).success).toBe(true);
    expect(adminUserActionSchema.safeParse({ action: "DELETE_ALL_DATA" }).success).toBe(false);
  });

  it("whitelists report resolutions", () => {
    expect(adminReportActionSchema.safeParse({ action: "RESOLVE", note: "Handled" }).success).toBe(true);
    expect(adminReportActionSchema.safeParse({ action: "BAN_EVERYONE" }).success).toBe(false);
  });

  it("rejects invalid site setting values", () => {
    expect(adminSettingsSchema.safeParse({ registrationOpen: "false" }).success).toBe(true);
    expect(adminSettingsSchema.safeParse({ registrationOpen: "yes" }).success).toBe(false);
  });
});

describe("translateSchema", () => {
  it("only allows plain language tags", () => {
    expect(translateSchema.safeParse({ text: "Hello", targetLang: "pt-BR" }).success).toBe(true);
    expect(translateSchema.safeParse({ text: "Hello", targetLang: "en; DROP TABLE" }).success).toBe(false);
  });

  it("rejects empty text", () => {
    expect(translateSchema.safeParse({ text: "  ", targetLang: "fr" }).success).toBe(false);
  });
});

describe("zod contract sanity", () => {
  it("produces field errors for the API envelope", () => {
    const result = adminSettingsSchema.safeParse({ registrationOpen: "maybe" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const flat = (result.error as z.ZodError).flatten();
      expect(flat.fieldErrors.registrationOpen?.[0]).toBeTruthy();
    }
  });
});
