import { z } from 'zod';
import { countSentences } from './sentences.ts';

/**
 * Schemat wyniku analizy (sekcja 04 briefu). Jedno źródło prawdy dla:
 *  - backendu (walidacja odpowiedzi modelu + 1 ponowna próba),
 *  - frontendu (walidacja przed wyświetleniem i eksportem),
 *  - testów jednostkowych (Vitest).
 * Pola można dodawać (np. `meta`), nie można ich usuwać.
 */

export const DOCUMENT_TYPES = ['faktura', 'umowa', 'oferta', 'raport', 'inne'] as const;

export const SUMMARY_MIN_SENTENCES = 3;
export const SUMMARY_MAX_SENTENCES = 5;
export const KEY_POINTS_MIN = 3;
export const KEY_POINTS_MAX = 7;
export const KEYWORDS_MAX = 12;
export const AMOUNTS_MAX = 30;
export const DATES_MAX = 30;

/** Data kalendarzowa ISO 8601 (YYYY-MM-DD), która faktycznie istnieje (bez 2026-02-30). */
export function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

const supportedCurrencies: ReadonlySet<string> | null = (() => {
  try {
    return new Set(Intl.supportedValuesOf('currency'));
  } catch {
    return null;
  }
})();

/** Kod waluty ISO 4217 (np. PLN, EUR) — wielkie litery, znany środowisku Intl, jeśli dostępne. */
export function isValidCurrency(value: string): boolean {
  if (!/^[A-Z]{3}$/.test(value)) return false;
  return supportedCurrencies ? supportedCurrencies.has(value) : true;
}

const nonEmptyText = z.string().trim().min(1, 'Pole nie może być puste');
const isoDate = z.string().refine(isValidIsoDate, 'Data musi być w formacie ISO 8601 (YYYY-MM-DD)');

export const amountSchema = z.object({
  value: z.number().finite(),
  currency: z.string().refine(isValidCurrency, 'Waluta musi być kodem ISO 4217 (np. PLN)'),
  context: nonEmptyText,
});

export const dateEntrySchema = z.object({
  date: isoDate,
  context: nonEmptyText,
});

/** Część wyniku generowana przez model (bez metadanych pliku). */
export const aiDocumentSchema = z.object({
  language: z.string().regex(/^[a-z]{2}$/, 'Język musi być kodem ISO 639-1 (np. pl)'),
  type: z.enum(DOCUMENT_TYPES),
  title: nonEmptyText.nullable(),
  date: isoDate.nullable(),
});

export const aiOutputSchema = z.object({
  document: aiDocumentSchema,
  summary: nonEmptyText.refine((text) => {
    const n = countSentences(text);
    return n >= SUMMARY_MIN_SENTENCES && n <= SUMMARY_MAX_SENTENCES;
  }, `Podsumowanie musi mieć ${SUMMARY_MIN_SENTENCES}–${SUMMARY_MAX_SENTENCES} zdań`),
  keyPoints: z.array(nonEmptyText).min(KEY_POINTS_MIN).max(KEY_POINTS_MAX),
  entities: z.object({
    organizations: z.array(nonEmptyText),
    people: z.array(nonEmptyText),
  }),
  amounts: z.array(amountSchema).max(AMOUNTS_MAX),
  dates: z.array(dateEntrySchema).max(DATES_MAX),
  keywords: z.array(nonEmptyText).max(KEYWORDS_MAX),
});

export const metaSchema = z.object({
  model: z.string(),
  generatedAt: z.string(),
  chunks: z.number().int().positive(),
  ocrPages: z.array(z.number().int().positive()),
  warnings: z.array(z.string()),
});

/** Pełny wynik zgodny ze schematem z briefu + dodatkowe pole `meta`. */
export const insightSchema = aiOutputSchema.extend({
  document: aiDocumentSchema.extend({
    fileName: nonEmptyText,
    pages: z.number().int().positive(),
  }),
  meta: metaSchema.optional(),
});

export type AiOutput = z.infer<typeof aiOutputSchema>;
export type Insight = z.infer<typeof insightSchema>;
export type InsightMeta = z.infer<typeof metaSchema>;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** Zwięzła lista błędów walidacji (do logów/feedbacku dla modelu przy ponownej próbie). */
export function formatIssues(error: z.ZodError): string[] {
  return error.issues.slice(0, 10).map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
    return `${path}: ${issue.message}`;
  });
}
