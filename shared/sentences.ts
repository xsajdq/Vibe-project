/**
 * Liczy zdania w tekście (PL/EN) na potrzeby walidacji podsumowania (3–5 zdań).
 *
 * Prosty podział po [.!?] dawałby fałszywe trafienia na skrótach typowych dla
 * dokumentów biznesowych („sp. z o.o.”, „ul.”, „r.”, „S.A.”, „12.03.2026 r.”),
 * dlatego kropka kończy zdanie tylko wtedy, gdy:
 *  - po niej jest koniec tekstu albo biały znak + wielka litera / cyfra / cudzysłów,
 *  - słowo przed kropką nie jest skrótem „wewnętrznym” ani inicjałem (pojedyncza litera).
 */
/** Skróty, po których zdanie praktycznie nigdy się nie kończy (zawsze następuje dalszy ciąg). */
const INNER_ABBREVIATIONS = new Set([
  'sp',
  'ul',
  'al',
  'pl',
  'nr',
  'tj',
  'np',
  'm.in',
  'tzn',
  'tzw',
  'ok',
  'godz',
  'ust',
  'pkt',
  'art',
  'gr',
  'dr',
  'inż',
  'mgr',
  'prof',
  'św',
  'wg',
  'poz',
  'zał',
  'str',
  'tel',
  'e.g',
  'i.e',
  'vs',
  'mr',
  'mrs',
  'ms',
  'no',
]);

/**
 * Skróty, które mogą zamykać zdanie („…zawarta z Kwadrat Software S.A. Umowa…”).
 * Traktujemy je jako koniec zdania tylko, gdy dalej jest wielka litera (nie cyfra).
 */
const TRAILING_ABBREVIATIONS = new Set([
  'r',
  'o.o',
  'z.o.o',
  's.a',
  'zł',
  'itd',
  'itp',
  'tys',
  'mln',
  'mld',
  'etc',
  'inc',
  'ltd',
]);

const TERMINATOR = /[.!?…]+["”»)]*(?=\s|$)/gu;

export function countSentences(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;

  let count = 0;
  let lastEnd = 0;
  for (const match of trimmed.matchAll(TERMINATOR)) {
    const index = match.index;
    const end = index + match[0].length;
    const rest = trimmed.slice(end);
    const isTextEnd = rest.trim().length === 0;

    if (!isTextEnd) {
      const next = rest.trimStart().charAt(0);
      const startsNewSentence = /[\p{Lu}\d"„“«(]/u.test(next);
      if (!startsNewSentence) continue;

      if (match[0].startsWith('.')) {
        const before = trimmed.slice(lastEnd, index);
        const lastWord = (before.split(/\s+/).pop() ?? '').toLowerCase().replace(/^[("„“]+/, '');
        const isInitial = /^\p{L}$/u.test(lastWord) && lastWord !== 'r';
        if (INNER_ABBREVIATIONS.has(lastWord) || isInitial) continue;
        if (TRAILING_ABBREVIATIONS.has(lastWord) && !/\p{Lu}/u.test(next)) continue;
      }
    }

    count += 1;
    lastEnd = end;
    if (isTextEnd) return count;
  }
  // Tekst bez końcowej kropki — ostatni fragment też jest zdaniem.
  return trimmed.slice(lastEnd).trim().length > 0 ? count + 1 : count;
}
