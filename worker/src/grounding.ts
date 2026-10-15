import type { AiOutput } from '../../shared/schema.ts';

/**
 * Ochrona przed halucynacjami liczbowymi: kwota zwrócona przez model musi występować
 * w tekście dokumentu (w dowolnym zapisie: „184 500,00 zł”, „184500.00”, „12,5 tys. zł”).
 */

const MULTIPLIERS: Record<string, number> = {
  tys: 1e3,
  k: 1e3,
  thousand: 1e3,
  mln: 1e6,
  m: 1e6,
  million: 1e6,
  mld: 1e9,
  bn: 1e9,
  billion: 1e9,
};

export function extractNumbers(text: string): Set<number> {
  const normalized = text
    // separatory tysięcy: spacja, twarda spacja, wąska spacja, kropka, apostrof
    .replace(/(?<=\d)[\s\u00a0\u202f.'](?=\d{3}(?!\d))/g, '')
    // przecinek dziesiętny → kropka
    .replace(/(?<=\d),(?=\d)/g, '.');

  const numbers = new Set<number>();
  for (const match of normalized.matchAll(
    /(\d+(?:\.\d+)?)\s*(tys|mln|mld|k|m|bn|thousand|million|billion)?\b/gi,
  )) {
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    numbers.add(value);
    const unit = match[2]?.toLowerCase();
    const multiplier = unit ? MULTIPLIERS[unit] : undefined;
    if (multiplier) numbers.add(Math.round(value * multiplier * 100) / 100);
  }
  return numbers;
}

function hasNumber(numbers: Set<number>, value: number): boolean {
  const target = Math.abs(value);
  for (const n of numbers) {
    if (Math.abs(n - target) < 0.005) return true;
  }
  return false;
}

function dedupeStrings(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLocaleLowerCase();
    if (trimmed.length === 0 || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export interface GroundingResult {
  output: AiOutput;
  /** Kwoty usunięte, bo nie występują w tekście (tryb weryfikacji). */
  removedAmounts: number;
  /** Kwoty nieobecne w warstwie tekstowej, zachowane, bo mogą pochodzić z OCR skanów. */
  unverifiedAmounts: number;
}

/**
 * Usuwa kwoty nieobecne w tekście oraz duplikaty. Gdy część treści pochodzi ze skanów
 * (OCR wykonuje model), nie mamy pełnego tekstu do porównania — wtedy takie kwoty
 * zachowujemy, ale zliczamy jako niezweryfikowane (UI pokazuje ostrzeżenie).
 */
export function groundOutput(
  output: AiOutput,
  sourceText: string,
  canVerifyAmounts: boolean,
): GroundingResult {
  const numbers = extractNumbers(sourceText);

  const seenAmounts = new Set<string>();
  let removedAmounts = 0;
  let unverifiedAmounts = 0;
  const amounts = output.amounts.filter((amount) => {
    if (!hasNumber(numbers, amount.value)) {
      if (canVerifyAmounts) {
        removedAmounts += 1;
        return false;
      }
      unverifiedAmounts += 1;
    }
    const key = `${amount.value}|${amount.currency}|${amount.context.toLocaleLowerCase()}`;
    if (seenAmounts.has(key)) return false;
    seenAmounts.add(key);
    return true;
  });

  const seenDates = new Set<string>();
  const dates = output.dates.filter((entry) => {
    const key = `${entry.date}|${entry.context.toLocaleLowerCase()}`;
    if (seenDates.has(key)) return false;
    seenDates.add(key);
    return true;
  });

  return {
    removedAmounts,
    unverifiedAmounts,
    output: {
      ...output,
      entities: {
        organizations: dedupeStrings(output.entities.organizations),
        people: dedupeStrings(output.entities.people),
      },
      amounts,
      dates,
      keywords: dedupeStrings(output.keywords),
    },
  };
}
