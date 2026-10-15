import { apiErrorSchema, modelsResponseSchema } from '../../shared/api.ts';
import type { AnalyzeRequest } from '../../shared/api.ts';
import { formatIssues, insightSchema } from '../../shared/schema.ts';
import type { Insight } from '../../shared/schema.ts';
import { AppError } from '../lib/errors.ts';

const REQUEST_TIMEOUT_MS = 90_000;

function apiUrl(path: '/api/analyze' | '/api/models' | '/api/health'): string {
  const base = import.meta.env.VITE_API_URL;
  if (!base) {
    throw new AppError('Aplikacja nie ma skonfigurowanego adresu API (VITE_API_URL).', false);
  }
  return `${base.replace(/\/$/, '')}${path}`;
}

/** Lista modeli dozwolonych przez backend (pierwszy = domyślny). */
export async function fetchModels(signal?: AbortSignal): Promise<string[]> {
  const response = await fetch(apiUrl('/api/models'), { signal: signal ?? null });
  if (!response.ok) throw new AppError('Nie udało się pobrać listy modeli.', true);
  return modelsResponseSchema.parse(await response.json()).models;
}

/** Czy backend odpowiada (do paska statusu). */
export async function checkHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch(apiUrl('/api/health'), { signal: signal ?? null });
    return response.ok;
  } catch {
    return false;
  }
}

/** Komunikaty dla kodów błędów, które warto przeformułować z perspektywy użytkownika. */
const NON_RETRYABLE = new Set([
  'BAD_REQUEST',
  'PAYLOAD_TOO_LARGE',
  'EMPTY_DOCUMENT',
  'FORBIDDEN_ORIGIN',
]);

export async function analyzeDocument(
  request: AnalyzeRequest,
  signal?: AbortSignal,
): Promise<Insight> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetch(apiUrl('/api/analyze'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: combined,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (signal?.aborted) throw new AppError('Analiza została anulowana.', true);
    if (timeout.aborted) {
      throw new AppError('Analiza trwa zbyt długo. Spróbuj ponownie za chwilę.', true);
    }
    throw new AppError(
      'Brak połączenia z serwerem analizy. Sprawdź internet i spróbuj ponownie.',
      true,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new AppError('Serwer zwrócił nieczytelną odpowiedź. Spróbuj ponownie.', true);
  }

  if (!response.ok) {
    const parsedError = apiErrorSchema.safeParse(body);
    if (parsedError.success) {
      const { code, message } = parsedError.data.error;
      throw new AppError(message, !NON_RETRYABLE.has(code));
    }
    throw new AppError(`Serwer zwrócił błąd (${response.status}). Spróbuj ponownie.`, true);
  }

  // F-04: wynik walidowany schematem przed wyświetleniem (niezależnie od walidacji na backendzie).
  const parsed = insightSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(
      `Wynik analizy nie jest zgodny ze schematem (${formatIssues(parsed.error)[0] ?? 'nieznany błąd'}). Spróbuj ponownie.`,
      true,
    );
  }
  return parsed.data;
}
