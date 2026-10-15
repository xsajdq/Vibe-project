import type { AnalyzeRequest } from '../../shared/api.ts';
import {
  AMOUNTS_MAX,
  DATES_MAX,
  KEYWORDS_MAX,
  aiOutputSchema,
  formatIssues,
} from '../../shared/schema.ts';
import type { AiOutput, Insight } from '../../shared/schema.ts';
import { chunkPages } from './chunk.ts';
import type { Env } from './env.ts';
import { groundOutput } from './grounding.ts';
import { HttpError } from './http.ts';
import type { ChatMessage } from './llm.ts';
import { chatJson, parseModelJson } from './llm.ts';
import type { ChunkInfo, ContentPart } from './prompt.ts';
import { buildChunkContent, buildMergeContent } from './prompt.ts';

type Deps = { fetchImpl?: typeof fetch; now?: () => Date };

type ValidationResult = { ok: true; value: AiOutput } | { ok: false; problems: string[] };

function validate(content: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = parseModelJson(content);
  } catch {
    return { ok: false, problems: ['Odpowiedź nie jest poprawnym JSON-em.'] };
  }
  const result = aiOutputSchema.safeParse(parsed);
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, problems: formatIssues(result.error) };
}

/**
 * Jedno wywołanie modelu z walidacją Zod. Zgodnie z briefem: przy błędnej odpowiedzi
 * wykonujemy dokładnie 1 ponowną próbę (z listą błędów jako feedback), potem błąd.
 */
export async function generateValidated(
  env: Env,
  content: ContentPart[],
  fetchImpl?: typeof fetch,
): Promise<AiOutput> {
  const messages: ChatMessage[] = [{ role: 'user', content }];
  const first = await chatJson(env, messages, fetchImpl);
  const firstResult = validate(first);
  if (firstResult.ok) return firstResult.value;

  const retryMessages: ChatMessage[] = [
    ...messages,
    { role: 'assistant', content: first.slice(0, 20_000) || '(pusta odpowiedź)' },
    {
      role: 'user',
      content:
        'Twoja odpowiedź nie przeszła walidacji schematu:\n- ' +
        firstResult.problems.join('\n- ') +
        '\nZwróć poprawiony, kompletny JSON zgodny ze schematem i zasadami. Bez komentarzy.',
    },
  ];
  const second = await chatJson(env, retryMessages, fetchImpl);
  const secondResult = validate(second);
  if (secondResult.ok) return secondResult.value;

  throw new HttpError(
    502,
    'AI_INVALID_RESPONSE',
    'Model AI dwukrotnie zwrócił odpowiedź niezgodną ze schematem. Spróbuj ponownie.',
  );
}

/** Deterministyczne łączenie list z fragmentów (bez udziału modelu — nic nie ginie). */
function unionLists(
  partials: readonly AiOutput[],
): Pick<AiOutput, 'entities' | 'amounts' | 'dates'> {
  return {
    entities: {
      organizations: partials.flatMap((p) => p.entities.organizations),
      people: partials.flatMap((p) => p.entities.people),
    },
    amounts: partials.flatMap((p) => p.amounts),
    dates: partials.flatMap((p) => p.dates),
  };
}

export async function analyzeDocument(
  env: Env,
  request: AnalyzeRequest,
  deps: Deps = {},
): Promise<Insight> {
  const chunks = chunkPages(request.pages);
  const hasScans = request.scans.length > 0;
  if (chunks.length === 0 && !hasScans) {
    throw new HttpError(
      422,
      'EMPTY_DOCUMENT',
      'Nie znaleziono tekstu w dokumencie. Plik może być pustym lub zeskanowanym PDF-em.',
    );
  }
  // Same skany: jeden „fragment” bez tekstu, tylko z obrazami.
  const work = chunks.length > 0 ? chunks : [[]];

  const baseInfo: Omit<ChunkInfo, 'index'> = {
    fileName: request.fileName,
    pageCount: request.pageCount,
    total: work.length,
  };

  // F-08: fragmenty analizowane równolegle (skany dołączone do pierwszego fragmentu).
  const partials = await Promise.all(
    work.map((pages, index) =>
      generateValidated(
        env,
        buildChunkContent(pages, index === 0 ? request.scans : [], { ...baseInfo, index }),
        deps.fetchImpl,
      ),
    ),
  );

  let combined: AiOutput;
  if (partials.length === 1 && partials[0]) {
    combined = partials[0];
  } else {
    const merged = await generateValidated(
      env,
      buildMergeContent(partials, { ...baseInfo, index: 0 }),
      deps.fetchImpl,
    );
    combined = { ...merged, ...unionLists(partials) };
  }

  const sourceText = request.pages.map((page) => page.text).join('\n');
  const { output, removedAmounts, unverifiedAmounts } = groundOutput(
    combined,
    sourceText,
    !hasScans,
  );

  // Po scaleniu listy mogą przekroczyć limity schematu — przycinamy deterministycznie.
  output.amounts = output.amounts.slice(0, AMOUNTS_MAX);
  output.dates = output.dates.slice(0, DATES_MAX);
  output.keywords = output.keywords.slice(0, KEYWORDS_MAX);

  const warnings: string[] = [];
  if (removedAmounts > 0) {
    warnings.push(
      `Pominięto ${removedAmounts} kwot(y), których nie udało się potwierdzić w tekście dokumentu.`,
    );
  }
  if (unverifiedAmounts > 0) {
    warnings.push(
      `${unverifiedAmounts} kwot(y) nie występuje w warstwie tekstowej — pochodzą prawdopodobnie ze skanu (OCR). Zweryfikuj je.`,
    );
  }
  if (hasScans) {
    warnings.push(
      `Strony bez warstwy tekstowej (${request.scans.map((s) => s.page).join(', ')}) odczytano przez OCR modelu AI — sprawdź dane z tych stron.`,
    );
  }

  const now = deps.now?.() ?? new Date();
  // Kolejność kluczy jak w schemacie z briefu.
  return {
    document: {
      fileName: request.fileName,
      pages: request.pageCount,
      language: output.document.language,
      type: output.document.type,
      title: output.document.title,
      date: output.document.date,
    },
    summary: output.summary,
    keyPoints: output.keyPoints,
    entities: output.entities,
    amounts: output.amounts,
    dates: output.dates,
    keywords: output.keywords,
    meta: {
      model: env.AI_MODEL,
      generatedAt: now.toISOString(),
      chunks: work.length,
      ocrPages: request.scans.map((scan) => scan.page),
      warnings,
    },
  };
}
