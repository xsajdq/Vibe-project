import { HttpError } from './http.ts';
import type { Env } from './env.ts';
import type { ContentPart } from './prompt.ts';
import { RESPONSE_JSON_SCHEMA, SYSTEM_PROMPT } from './prompt.ts';

/**
 * Minimalny klient API zgodnego z OpenAI Chat Completions.
 * Domyślnie Google Gemini (endpoint /v1beta/openai), ale działa też np. z Groq czy OpenRouter —
 * zmiana dostawcy to tylko AI_BASE_URL + AI_MODEL (+ AI_FALLBACK_MODELS) + AI_API_KEY.
 */

export type ChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string | ContentPart[] }
  | { role: 'assistant'; content: string };

/** Limit na jedną próbę — po nim przechodzimy na model zapasowy. */
const REQUEST_TIMEOUT_MS = 35_000;

interface ChatCompletionResponse {
  choices?: { message?: { content?: string | null } }[];
}

/** Dozwolone modele: główny + zapasowe (AI_FALLBACK_MODELS, CSV), bez duplikatów. */
export function modelChain(env: Env): string[] {
  const fallbacks = (env.AI_FALLBACK_MODELS ?? '').split(',').map((m) => m.trim());
  return [...new Set([env.AI_MODEL, ...fallbacks].filter((m) => m.length > 0))];
}

/**
 * Kolejność prób dla żądania: model wybrany przez użytkownika (tylko z listy dozwolonych)
 * na początku, potem pozostałe jako zapasowe.
 */
export function preferredChain(env: Env, preferred: string | undefined): string[] {
  const chain = modelChain(env);
  if (!preferred || !chain.includes(preferred)) return chain;
  return [preferred, ...chain.filter((model) => model !== preferred)];
}

export interface CallContext {
  /** Modele w kolejności prób. */
  models: readonly string[];
  /** Faktycznie użyte modele (do pola meta.model). */
  usedModels: Set<string>;
  fetchImpl?: typeof fetch;
}

async function post(
  env: Env,
  body: Record<string, unknown>,
  fetchImpl: typeof fetch,
): Promise<Response | null> {
  try {
    return await fetchImpl(`${env.AI_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.AI_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return null; // timeout lub błąd sieci
  }
}

/**
 * Błędy, przy których warto spróbować innego modelu: przeciążenie (503), limit (429),
 * awaria (5xx), timeout, a także 404 (model wycofany lub niedostępny dla klucza).
 */
function shouldTryNextModel(response: Response | null): boolean {
  return (
    response === null ||
    response.status === 404 ||
    response.status === 429 ||
    response.status >= 500
  );
}

/**
 * Wywołuje model i zwraca treść odpowiedzi (JSON jako tekst). Darmowe modele bywają
 * przeciążone (503 / brak odpowiedzi), więc przy błędach przejściowych próbujemy kolejnego
 * modelu z `ctx.models`.
 */
export async function chatJson(
  env: Env,
  messages: ChatMessage[],
  ctx: CallContext,
): Promise<string> {
  const fetchImpl = ctx.fetchImpl ?? fetch;
  let last: Response | null = null;

  for (const model of ctx.models) {
    const body: Record<string, unknown> = {
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'pdf_insight', strict: true, schema: RESPONSE_JSON_SCHEMA },
      },
    };
    if (env.AI_REASONING_EFFORT) body.reasoning_effort = env.AI_REASONING_EFFORT;

    let response = await post(env, body, fetchImpl);
    if (response?.status === 400) {
      // Część dostawców/modeli nie obsługuje json_schema — wtedy zwykły tryb JSON;
      // zgodność ze schematem i tak egzekwuje walidacja Zod.
      response = await post(env, { ...body, response_format: { type: 'json_object' } }, fetchImpl);
    }
    last = response;
    if (shouldTryNextModel(response)) continue;
    if (!response?.ok) break;

    let data: ChatCompletionResponse;
    try {
      data = (await response.json()) as ChatCompletionResponse;
    } catch {
      continue;
    }
    ctx.usedModels.add(model);
    const content = data.choices?.[0]?.message?.content;
    return typeof content === 'string' ? content : '';
  }

  if (last === null) {
    throw new HttpError(
      504,
      'AI_UNAVAILABLE',
      'Usługa AI nie odpowiedziała na czas. Spróbuj ponownie.',
    );
  }
  if (last.status === 429 || last.status === 503) {
    throw new HttpError(
      503,
      'AI_QUOTA',
      'Usługa AI jest chwilowo przeciążona lub wyczerpano darmowy limit. Spróbuj ponownie za minutę.',
    );
  }
  throw new HttpError(
    502,
    'AI_UNAVAILABLE',
    `Usługa AI zwróciła błąd (${last.status}). Spróbuj ponownie.`,
  );
}

/** Parsuje JSON z odpowiedzi modelu, tolerując ewentualne ogrodzenie ```json ... ```. */
export function parseModelJson(content: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(content);
  const raw = (fenced?.[1] ?? content).trim();
  return JSON.parse(raw) as unknown;
}
