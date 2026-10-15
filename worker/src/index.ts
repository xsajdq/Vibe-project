import { LIMITS, analyzeRequestSchema } from '../../shared/api.ts';
import { analyzeDocument } from './analyze.ts';
import type { Env } from './env.ts';
import { HttpError, corsHeaders, errorResponse, json, parseAllowedOrigins } from './http.ts';
import { checkRateLimit } from './rateLimit.ts';

/**
 * PDF Insight API (Cloudflare Worker) — proxy do LLM, które trzyma klucz API po stronie serwera.
 *
 *   GET  /api/health   → { ok: true }
 *   POST /api/analyze  → Insight (schemat z shared/schema.ts)
 *
 * Zabezpieczenia: CORS tylko dla originów z ALLOWED_ORIGINS, limit żądań per IP,
 * limit rozmiaru ciała, walidacja wejścia (Zod), brak logowania treści dokumentów.
 */

async function readJsonBody(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > LIMITS.maxBodyBytes) {
    throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Dokument jest zbyt duży do analizy.');
  }
  const raw = await request.text();
  if (raw.length > LIMITS.maxBodyBytes) {
    throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Dokument jest zbyt duży do analizy.');
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new HttpError(400, 'BAD_REQUEST', 'Niepoprawne dane żądania.');
  }
}

async function handleAnalyze(
  request: Request,
  env: Env,
  cors: Record<string, string>,
): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (!(await checkRateLimit(env, ip))) {
    throw new HttpError(
      429,
      'RATE_LIMITED',
      'Zbyt wiele analiz w krótkim czasie. Odczekaj minutę i spróbuj ponownie.',
    );
  }

  const parsed = analyzeRequestSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    throw new HttpError(400, 'BAD_REQUEST', 'Niepoprawne dane żądania.');
  }
  const totalChars = parsed.data.pages.reduce((sum, page) => sum + page.text.length, 0);
  if (totalChars > LIMITS.maxTextChars) {
    throw new HttpError(
      413,
      'PAYLOAD_TOO_LARGE',
      'Dokument zawiera zbyt dużo tekstu do analizy w wersji demo.',
    );
  }

  const insight = await analyzeDocument(env, parsed.data);
  return json(insight, 200, cors);
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin')?.replace(/\/$/, '') ?? '';
  const allowed = parseAllowedOrigins(env.ALLOWED_ORIGINS);
  const isAllowedOrigin = origin !== '' && allowed.includes(origin);
  const cors = isAllowedOrigin ? corsHeaders(origin) : {};

  try {
    if (url.pathname === '/api/health' && request.method === 'GET') {
      return json({ ok: true }, 200, cors);
    }
    if (url.pathname !== '/api/analyze') {
      throw new HttpError(404, 'BAD_REQUEST', 'Nie znaleziono.');
    }
    if (!isAllowedOrigin) {
      throw new HttpError(403, 'FORBIDDEN_ORIGIN', 'Żądanie z niedozwolonej domeny.');
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'POST') {
      throw new HttpError(405, 'BAD_REQUEST', 'Dozwolona metoda: POST.');
    }
    if (!env.AI_API_KEY) {
      throw new HttpError(500, 'INTERNAL', 'Backend nie ma skonfigurowanego klucza AI.');
    }
    return await handleAnalyze(request, env, cors);
  } catch (error) {
    if (error instanceof HttpError) return errorResponse(error, cors);
    return errorResponse(
      new HttpError(500, 'INTERNAL', 'Wystąpił nieoczekiwany błąd serwera. Spróbuj ponownie.'),
      cors,
    );
  }
}

export default {
  fetch: handleRequest,
} satisfies ExportedHandler<Env>;
