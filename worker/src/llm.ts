import { HttpError } from './http.ts';
import type { Env } from './env.ts';
import type { ContentPart } from './prompt.ts';
import { RESPONSE_JSON_SCHEMA, SYSTEM_PROMPT } from './prompt.ts';

/**
 * Minimalny klient API zgodnego z OpenAI Chat Completions.
 * Domyślnie Google Gemini (endpoint /v1beta/openai), ale działa też np. z Groq czy OpenRouter —
 * zmiana dostawcy to tylko AI_BASE_URL + AI_MODEL + AI_API_KEY.
 */

export type ChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string | ContentPart[] }
  | { role: 'assistant'; content: string };

const REQUEST_TIMEOUT_MS = 50_000;

interface ChatCompletionResponse {
  choices?: { message?: { content?: string | null } }[];
}

async function post(
  env: Env,
  body: Record<string, unknown>,
  fetchImpl: typeof fetch,
): Promise<Response> {
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
    throw new HttpError(
      504,
      'AI_UNAVAILABLE',
      'Usługa AI nie odpowiedziała na czas. Spróbuj ponownie.',
    );
  }
}

export async function chatJson(
  env: Env,
  messages: ChatMessage[],
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const body: Record<string, unknown> = {
    model: env.AI_MODEL,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'pdf_insight', strict: true, schema: RESPONSE_JSON_SCHEMA },
    },
  };
  if (env.AI_REASONING_EFFORT) body.reasoning_effort = env.AI_REASONING_EFFORT;

  let response = await post(env, body, fetchImpl);
  if (response.status === 400) {
    // Część dostawców/modeli nie obsługuje json_schema — wtedy zwykły tryb JSON;
    // zgodność ze schematem i tak egzekwuje walidacja Zod.
    response = await post(env, { ...body, response_format: { type: 'json_object' } }, fetchImpl);
  }

  if (response.status === 429) {
    throw new HttpError(
      503,
      'AI_QUOTA',
      'Wyczerpano chwilowy limit darmowego API AI. Spróbuj ponownie za minutę.',
    );
  }
  if (!response.ok) {
    throw new HttpError(
      502,
      'AI_UNAVAILABLE',
      `Usługa AI zwróciła błąd (${response.status}). Spróbuj ponownie.`,
    );
  }

  let data: ChatCompletionResponse;
  try {
    data = (await response.json()) as ChatCompletionResponse;
  } catch {
    throw new HttpError(502, 'AI_UNAVAILABLE', 'Usługa AI zwróciła nieczytelną odpowiedź.');
  }
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.trim().length === 0) {
    return '';
  }
  return content;
}

/** Parsuje JSON z odpowiedzi modelu, tolerując ewentualne ogrodzenie ```json ... ```. */
export function parseModelJson(content: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(content);
  const raw = (fenced?.[1] ?? content).trim();
  return JSON.parse(raw) as unknown;
}
