import { z } from 'zod';

/** Kontrakt HTTP między frontendem (GitHub Pages) a backendem (Cloudflare Worker). */

export const LIMITS = {
  /** Maksymalny rozmiar wgrywanego pliku PDF (F-01). */
  maxFileBytes: 10 * 1024 * 1024,
  /** Maksymalna liczba znaków tekstu wysyłanego do analizy. */
  maxTextChars: 400_000,
  /** Maksymalna liczba stron-skanów wysyłanych do OCR przez model (F-10). */
  maxScanPages: 3,
  /** Maksymalna długość pojedynczego obrazu (data URL, base64). */
  maxImageChars: 900_000,
  /** Maksymalny rozmiar ciała żądania do backendu. */
  maxBodyBytes: 4 * 1024 * 1024,
} as const;

export const pageTextSchema = z.object({
  page: z.number().int().positive(),
  text: z.string(),
});

export const scanSchema = z.object({
  page: z.number().int().positive(),
  image: z
    .string()
    .max(LIMITS.maxImageChars)
    .regex(/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/, 'Niepoprawny obraz strony'),
});

export const analyzeRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  pageCount: z.number().int().positive().max(5000),
  pages: z.array(pageTextSchema).max(5000),
  scans: z.array(scanSchema).max(LIMITS.maxScanPages),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type PageText = z.infer<typeof pageTextSchema>;
export type Scan = z.infer<typeof scanSchema>;

export const ERROR_CODES = [
  'BAD_REQUEST',
  'PAYLOAD_TOO_LARGE',
  'FORBIDDEN_ORIGIN',
  'RATE_LIMITED',
  'EMPTY_DOCUMENT',
  'AI_INVALID_RESPONSE',
  'AI_UNAVAILABLE',
  'AI_QUOTA',
  'INTERNAL',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
