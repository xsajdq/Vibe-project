import type { Insight } from '../schema.ts';

export function validInsight(): Insight {
  return {
    document: {
      fileName: 'umowa.pdf',
      pages: 4,
      language: 'pl',
      type: 'umowa',
      title: 'Umowa serwisowa',
      date: '2026-09-01',
    },
    summary:
      'Umowa określa zasady świadczenia usług serwisowych przez Przykład sp. z o.o. Okres obowiązywania wynosi 12 miesięcy. Wynagrodzenie wynosi 12 500,00 zł netto miesięcznie.',
    keyPoints: ['Okres umowy 12 mies.', 'SLA 99,5%', 'Płatność w 14 dni'],
    entities: { organizations: ['Przykład sp. z o.o.'], people: [] },
    amounts: [{ value: 12500, currency: 'PLN', context: 'wynagrodzenie' }],
    dates: [{ date: '2026-10-01', context: 'termin płatności' }],
    keywords: ['serwis', 'SLA'],
  };
}
