import { describe, expect, it } from 'vitest';
import { countSentences } from './sentences.ts';

describe('countSentences', () => {
  it('liczy zwykłe zdania', () => {
    expect(countSentences('Ala ma kota. Kot ma Alę! Czy to prawda?')).toBe(3);
  });

  it('nie dzieli na skrótach firmowych i datach', () => {
    const text =
      'Umowę zawarto 12.03.2026 r. pomiędzy Nordwave Logistics sp. z o.o. a Kwadrat Software S.A. Wynagrodzenie wynosi 184 500,00 zł netto. Umowa obowiązuje 24 miesiące.';
    expect(countSentences(text)).toBe(3);
  });

  it('nie dzieli na inicjałach i skrótach adresowych', () => {
    expect(countSentences('Podpisał A. Kowalczyk z ul. Portowej 18. To wszystko.')).toBe(2);
  });

  it('uznaje „S.A.” i „r.” za koniec zdania przed wielką literą', () => {
    expect(
      countSentences('Umowę podpisała Kwadrat Software S.A. Obowiązuje od 2026 r. Kwota to 5 zł.'),
    ).toBe(3);
  });

  it('liczy ostatnie zdanie bez kropki', () => {
    expect(countSentences('Pierwsze zdanie. Drugie bez kropki')).toBe(2);
  });

  it('zwraca 0 dla pustego tekstu', () => {
    expect(countSentences('   ')).toBe(0);
  });
});
