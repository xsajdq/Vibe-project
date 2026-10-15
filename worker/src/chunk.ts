import type { PageText } from '../../shared/api.ts';

/** Docelowy rozmiar fragmentu (~15–20 tys. tokenów) — bezpiecznie w limitach darmowego API. */
export const CHUNK_CHARS = 60_000;

/**
 * Dzieli strony dokumentu na fragmenty o łącznej długości ≤ maxChars (F-08).
 * Granice fragmentów wypadają między stronami; strona dłuższa niż limit jest dzielona na części.
 */
export function chunkPages(pages: readonly PageText[], maxChars = CHUNK_CHARS): PageText[][] {
  const chunks: PageText[][] = [];
  let current: PageText[] = [];
  let size = 0;

  const flush = () => {
    if (current.length > 0) chunks.push(current);
    current = [];
    size = 0;
  };

  for (const page of pages) {
    const text = page.text.trim();
    if (text.length === 0) continue;

    if (text.length > maxChars) {
      flush();
      for (let start = 0; start < text.length; start += maxChars) {
        chunks.push([{ page: page.page, text: text.slice(start, start + maxChars) }]);
      }
      continue;
    }
    if (size + text.length > maxChars) flush();
    current.push({ page: page.page, text });
    size += text.length;
  }
  flush();
  return chunks;
}
