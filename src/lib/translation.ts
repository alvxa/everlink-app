import "server-only";
import { detect as detectByStats } from "tinyld";
import { ApiError } from "./api";

export type TranslationResult = { text: string; provider: string; detectedSource?: string };

/** Languages the model has enough training data for in short social posts. */
const TINYLD_LANGUAGES = [
  "en", "tl", "es", "fr", "de", "pt", "it", "nl", "id", "ms", "vi", "th",
  "ja", "ko", "zh", "ar", "hi", "bn", "ta", "ru", "uk", "tr", "pl", "sv",
  "da", "fi", "no", "cs", "ro", "el", "he", "fa", "hu", "sw", "am",
];

/** Frequent function words that separate Tagalog from Indonesian/Malay. */
const TAGALOG_WORDS = new Set([
  "ang", "ng", "mga", "sa", "ako", "ikaw", "siya", "kami", "tayo", "kayo", "sila",
  "hindi", "oo", "opo", "po", "ba", "naman", "lang", "din", "rin", "ito", "iyan",
  "iyon", "yung", "kumusta", "salamat", "maganda", "magandang", "umaga", "hapon",
  "gabi", "paano", "bakit", "saan", "kailan", "sino", "anong", "pero", "kasi",
  "dahil", "para", "meron", "wala", "gusto", "ayaw", "alam", "talaga", "sobra",
  "napaka", "mabuti", "mahal", "kita", "natin", "ninyo", "nila", "niya", "kanila",
  "aking", "iyong", "ating", "inyong", "kanilang", "ako'y", "ikaw'y",
  "ka", "ko", "mo", "ni", "si", "may", "mayroon", "ano", "kung", "kapag",
  "yun", "dito", "doon", "ngayon", "bukas", "kahapon",
]);

/** Words that are distinctive enough to mark a short phrase as Tagalog on their own. */
const TAGALOG_MARKERS = new Set([
  "kumusta", "salamat", "maganda", "magandang", "mabuti", "opo", "naman",
  "yung", "mga", "ako", "ikaw", "siya", "kami", "tayo", "kayo", "sila",
  "hindi", "wala", "meron", "gusto", "ayaw", "talaga", "sobra", "napaka",
  "paano", "bakit", "saan", "kailan", "anong", "kasi", "dahil",
]);

const SCRIPT_RULES: { script: RegExp; lang: string }[] = [
  { script: /[\u0600-\u06FF]/g, lang: "ar" },
  { script: /[\u0590-\u05FF]/g, lang: "he" },
  { script: /[\u0900-\u097F]/g, lang: "hi" },
  { script: /[\u0980-\u09FF]/g, lang: "bn" },
  { script: /[\u0B80-\u0BFF]/g, lang: "ta" },
  { script: /[\u0E00-\u0E7F]/g, lang: "th" },
  { script: /[\u1200-\u137F]/g, lang: "am" },
  { script: /[\u0370-\u03FF]/g, lang: "el" },
  { script: /[\u0400-\u04FF]/g, lang: "ru" },
  { script: /[\u3040-\u30FF]/g, lang: "ja" },
  { script: /[\uAC00-\uD7AF]/g, lang: "ko" },
  { script: /[\u4E00-\u9FFF]/g, lang: "zh" },
];

const LETTERS = /[\p{L}]/gu;

function scriptLanguage(text: string): string | null {
  const total = (text.match(LETTERS) ?? []).length;
  if (!total) return null;
  for (const rule of SCRIPT_RULES) {
    const hits = (text.match(rule.script) ?? []).length;
    if (hits / total >= 0.5) return rule.lang;
  }
  return null;
}

function tagalogScore(text: string): number {
  const words = text.toLowerCase().match(/[\p{L}']+/gu) ?? [];
  if (words.length < 2) return 0;
  return words.filter((word) => TAGALOG_WORDS.has(word)).length;
}

function detectSource(text: string): string {
  const script = scriptLanguage(text);
  if (script) return script;
  const words = text.toLowerCase().match(/[\p{L}']+/gu) ?? [];
  if (words.some((word) => TAGALOG_MARKERS.has(word))) return "tl";
  const tagalog = tagalogScore(text);
  if (tagalog >= 2 && tagalog / words.length >= 0.2) {
    return "tl";
  }
  const guess = detectByStats(text, { only: TINYLD_LANGUAGES });
  return guess || "en";
}

function normalizeLang(code: string): string {
  const lower = code.toLowerCase();
  return lower === "zh" ? "zh-CN" : lower;
}

function chunkText(text: string, max = 480): string[] {
  if (text.length <= max) return [text];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n", max);
    if (cut < max / 2) cut = rest.lastIndexOf(". ", max);
    if (cut < max / 2) cut = rest.lastIndexOf(" ", max);
    if (cut < 1) cut = max;
    chunks.push(rest.slice(0, cut + 1));
    rest = rest.slice(cut + 1);
  }
  if (rest.trim()) chunks.push(rest);
  return chunks;
}

/**
 * Server-side translation adapter. Provider credentials never reach the browser.
 * When no provider is configured, the API returns a clear 503 instead of faking
 * a translation.
 */
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang = "auto"
): Promise<TranslationResult> {
  const provider = (process.env.TRANSLATION_PROVIDER || "").toLowerCase();
  if (!provider) {
    throw new ApiError(
      503,
      "TRANSLATION_NOT_CONFIGURED",
      "Translation is not configured on this server. Add TRANSLATION_PROVIDER and TRANSLATION_API_KEY to enable Language Bridge."
    );
  }

  if (provider === "libretranslate") {
    const base = process.env.TRANSLATION_BASE_URL || "https://libretranslate.com";
    const source = sourceLang === "auto" ? detectSource(text) : sourceLang.toLowerCase();
    const target = targetLang.toLowerCase();
    if (normalizeLang(source) === normalizeLang(target)) {
      return { text, provider: "libretranslate", detectedSource: source };
    }
    const res = await fetch(`${base.replace(/\/$/, "")}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source,
        target,
        format: "text",
        ...(process.env.TRANSLATION_API_KEY ? { api_key: process.env.TRANSLATION_API_KEY } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    }).catch(() => null);
    if (!res || !res.ok) {
      throw new ApiError(502, "TRANSLATION_FAILED", "The translation provider could not be reached.");
    }
    const data = (await res.json()) as { translatedText?: string; detectedLanguage?: { language?: string } };
    if (!data.translatedText) {
      throw new ApiError(502, "TRANSLATION_FAILED", "The translation provider returned an empty result.");
    }
    return { text: data.translatedText, provider: "libretranslate", detectedSource: data.detectedLanguage?.language ?? source };
  }

  if (provider === "google") {
    const key = process.env.TRANSLATION_API_KEY;
    if (!key) {
      throw new ApiError(503, "TRANSLATION_NOT_CONFIGURED", "Google Translate requires TRANSLATION_API_KEY.");
    }
    const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, target: targetLang, format: "text", source: sourceLang === "auto" ? undefined : sourceLang }),
      signal: AbortSignal.timeout(15_000),
    }).catch(() => null);
    if (!res || !res.ok) {
      throw new ApiError(502, "TRANSLATION_FAILED", "The translation provider could not be reached.");
    }
    const data = (await res.json()) as { data?: { translations?: { translatedText?: string; detectedSourceLanguage?: string }[] } };
    const first = data.data?.translations?.[0];
    if (!first?.translatedText) {
      throw new ApiError(502, "TRANSLATION_FAILED", "The translation provider returned an empty result.");
    }
    return { text: first.translatedText, provider: "google", detectedSource: first.detectedSourceLanguage };
  }

  if (provider === "mymemory") {
    const detected = sourceLang === "auto" ? detectSource(text) : sourceLang.toLowerCase();
    const target = normalizeLang(targetLang);
    if (!text.trim() || normalizeLang(detected) === target) {
      return { text, provider: "mymemory", detectedSource: detected };
    }

    const translated: string[] = [];
    for (const part of chunkText(text)) {
      const url = new URL("https://api.mymemory.translated.net/get");
      url.searchParams.set("q", part);
      url.searchParams.set("langpair", `${normalizeLang(detected)}|${target}`);
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) }).catch(() => null);
      if (!res || !res.ok) {
        throw new ApiError(502, "TRANSLATION_FAILED", "The translation provider could not be reached.");
      }
      const data = (await res.json()) as {
        responseStatus?: number;
        responseData?: { translatedText?: string };
        quotaFinished?: boolean;
      };
      if (data.quotaFinished || data.responseStatus === 403 || data.responseStatus === 429) {
        throw new ApiError(
          429,
          "TRANSLATION_QUOTA_EXCEEDED",
          "The free translation quota has been reached. Try again later or configure another provider."
        );
      }
      const output = data.responseData?.translatedText;
      if (data.responseStatus !== 200 || !output) {
        throw new ApiError(502, "TRANSLATION_FAILED", "The translation provider returned an empty result.");
      }
      if (/MYMEMORY WARNING/i.test(output)) {
        throw new ApiError(429, "TRANSLATION_QUOTA_EXCEEDED", "The free translation quota has been reached.");
      }
      translated.push(output);
    }
    return { text: translated.join(""), provider: "mymemory", detectedSource: detected };
  }

  throw new ApiError(503, "TRANSLATION_NOT_CONFIGURED", `Unsupported translation provider "${provider}".`);
}
