import { describe, expect, it } from 'vitest';
import { validInsight } from './__fixtures__/validInsight.ts';
import { aiOutputSchema, insightSchema, isValidCurrency, isValidIsoDate } from './schema.ts';

describe('insightSchema', () => {
  it('akceptuje przykład z briefu', () => {
    expect(insightSchema.safeParse(validInsight()).success).toBe(true);
  });

  it('akceptuje dodatkowe pole meta', () => {
    const data = {
      ...validInsight(),
      meta: {
        model: 'gemini',
        generatedAt: '2026-10-15T10:00:00.000Z',
        chunks: 1,
        ocrPages: [],
        warnings: [],
      },
    };
    expect(insightSchema.safeParse(data).success).toBe(true);
  });

  it('akceptuje brak informacji jako null / []', () => {
    const data = validInsight();
    data.document.title = null;
    data.document.date = null;
    data.amounts = [];
    data.dates = [];
    data.keywords = [];
    data.entities = { organizations: [], people: [] };
    expect(insightSchema.safeParse(data).success).toBe(true);
  });

  it('odrzuca brak wymaganego pola', () => {
    const { summary: _summary, ...withoutSummary } = validInsight();
    expect(insightSchema.safeParse(withoutSummary).success).toBe(false);
  });

  it('odrzuca nieznany typ dokumentu', () => {
    const data = { ...validInsight(), document: { ...validInsight().document, type: 'list' } };
    expect(insightSchema.safeParse(data).success).toBe(false);
  });

  it.each(['01.09.2026', '2026-13-01', '2026-02-30', '2026-9-1', 'wrzesień 2026'])(
    'odrzuca niepoprawną datę dokumentu %s',
    (date) => {
      const data = { ...validInsight(), document: { ...validInsight().document, date } };
      expect(insightSchema.safeParse(data).success).toBe(false);
    },
  );

  it.each(['zł', 'pln', 'PL', 'XYZ1', 'ABC'])('odrzuca walutę spoza ISO 4217: %s', (currency) => {
    const data = { ...validInsight(), amounts: [{ value: 1, currency, context: 'x' }] };
    expect(insightSchema.safeParse(data).success).toBe(false);
  });

  it('odrzuca kwotę zapisaną jako tekst', () => {
    const data = {
      ...validInsight(),
      amounts: [{ value: '12 500,00', currency: 'PLN', context: 'x' }],
    };
    expect(insightSchema.safeParse(data).success).toBe(false);
  });

  it('odrzuca język spoza ISO 639-1', () => {
    for (const language of ['pol', 'PL', 'polski']) {
      const data = { ...validInsight(), document: { ...validInsight().document, language } };
      expect(insightSchema.safeParse(data).success).toBe(false);
    }
  });

  it('wymaga 3–5 zdań podsumowania', () => {
    const tooShort = { ...validInsight(), summary: 'Jedno zdanie. Drugie zdanie.' };
    const tooLong = {
      ...validInsight(),
      summary: 'A jest. B jest. C jest. D jest. E jest. F jest.',
    };
    expect(insightSchema.safeParse(tooShort).success).toBe(false);
    expect(insightSchema.safeParse(tooLong).success).toBe(false);
  });

  it('wymaga 3–7 keyPoints', () => {
    expect(insightSchema.safeParse({ ...validInsight(), keyPoints: ['a', 'b'] }).success).toBe(
      false,
    );
    const eight = Array.from({ length: 8 }, (_, i) => `punkt ${i}`);
    expect(insightSchema.safeParse({ ...validInsight(), keyPoints: eight }).success).toBe(false);
  });

  it('odrzuca puste stringi w listach', () => {
    const data = { ...validInsight(), keywords: ['ok', '  '] };
    expect(insightSchema.safeParse(data).success).toBe(false);
  });

  it('wymaga fileName i pages w pełnym wyniku, ale nie w odpowiedzi modelu', () => {
    const { fileName: _f, pages: _p, ...aiDocument } = validInsight().document;
    const aiOutput = { ...validInsight(), document: aiDocument };
    expect(aiOutputSchema.safeParse(aiOutput).success).toBe(true);
    expect(insightSchema.safeParse(aiOutput).success).toBe(false);
  });
});

describe('isValidIsoDate / isValidCurrency', () => {
  it('rozpoznaje poprawne wartości', () => {
    expect(isValidIsoDate('2024-02-29')).toBe(true);
    expect(isValidIsoDate('2026-02-29')).toBe(false);
    expect(isValidCurrency('PLN')).toBe(true);
    expect(isValidCurrency('EUR')).toBe(true);
    expect(isValidCurrency('USD')).toBe(true);
  });
});
