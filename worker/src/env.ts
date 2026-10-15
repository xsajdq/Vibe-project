export interface Env {
  /** Klucz API dostawcy LLM — wyłącznie jako secret (`wrangler secret put AI_API_KEY`). */
  AI_API_KEY: string;
  /** Bazowy URL API zgodnego z OpenAI Chat Completions (domyślnie Gemini). */
  AI_BASE_URL: string;
  AI_MODEL: string;
  /** Opcjonalnie: "low" | "medium" | "high" — przekazywane jako reasoning_effort. */
  AI_REASONING_EFFORT?: string;
  /** Lista dozwolonych originów, rozdzielona przecinkami. */
  ALLOWED_ORIGINS: string;
  /** Binding Cloudflare Rate Limiting (opcjonalny — jest fallback w pamięci). */
  RATE_LIMITER?: RateLimit;
}
