import { describe, expect, it } from 'vitest';
import { validInsight } from '../../shared/__fixtures__/validInsight.ts';
import type { AiOutput } from '../../shared/schema.ts';
import { extractNumbers, groundOutput } from './grounding.ts';

function aiOutput(): AiOutput {
  const { fileName: _f, pages: _p, ...document } = validInsight().document;
  return { ...validInsight(), document };
}

describe('extractNumbers', () => {
  it('rozpoznaje polskie i angielskie zapisy kwot', () => {
    const numbers = extractNumbers(
      'Wynagrodzenie 184 500,00 zł, abonament 12 300,00 PLN, licencje 8,600 EUR? hosting 890 USD, 1.15 zł/km, 12,5 tys. zł',
    );
    expect(numbers.has(184500)).toBe(true);
    expect(numbers.has(12300)).toBe(true);
    expect(numbers.has(890)).toBe(true);
    expect(numbers.has(1.15)).toBe(true);
    expect(numbers.has(12500)).toBe(true);
  });

  it('nie skleja dat w jedną liczbę', () => {
    const numbers = extractNumbers('Termin: 12.03.2026');
    expect(numbers.has(12.03)).toBe(true);
    expect(numbers.has(2026)).toBe(true);
    expect(numbers.has(12032026)).toBe(false);
  });
});

describe('groundOutput', () => {
  it('usuwa kwoty, których nie ma w tekście (halucynacje)', () => {
    const output = aiOutput();
    output.amounts = [
      { value: 12500, currency: 'PLN', context: 'wynagrodzenie' },
      { value: 99999, currency: 'PLN', context: 'zmyślona kwota' },
    ];
    const { output: grounded, removedAmounts } = groundOutput(
      output,
      'Wynagrodzenie wynosi 12 500,00 zł netto.',
      true,
    );
    expect(grounded.amounts).toHaveLength(1);
    expect(removedAmounts).toBe(1);
  });

  it('przy OCR zachowuje kwoty spoza tekstu, ale oznacza je jako niezweryfikowane', () => {
    const output = aiOutput();
    output.amounts = [
      { value: 13100, currency: 'PLN', context: 'abonament od 2027' },
      { value: 12500, currency: 'PLN', context: 'wynagrodzenie' },
    ];
    const result = groundOutput(output, 'Wynagrodzenie 12 500 zł.', false);
    expect(result.output.amounts).toHaveLength(2);
    expect(result.unverifiedAmounts).toBe(1);
    expect(result.removedAmounts).toBe(0);
  });

  it('usuwa duplikaty encji, słów kluczowych, kwot i dat', () => {
    const output = aiOutput();
    output.entities.organizations = ['Firma A', 'firma a', ' Firma B '];
    output.keywords = ['CRM', 'crm', 'SLA'];
    output.amounts = [
      { value: 12500, currency: 'PLN', context: 'x' },
      { value: 12500, currency: 'PLN', context: 'x' },
    ];
    output.dates = [
      { date: '2026-01-01', context: 'start' },
      { date: '2026-01-01', context: 'Start' },
    ];
    const { output: grounded } = groundOutput(output, '12 500 zł', true);
    expect(grounded.entities.organizations).toEqual(['Firma A', 'Firma B']);
    expect(grounded.keywords).toEqual(['CRM', 'SLA']);
    expect(grounded.amounts).toHaveLength(1);
    expect(grounded.dates).toHaveLength(1);
  });
});
