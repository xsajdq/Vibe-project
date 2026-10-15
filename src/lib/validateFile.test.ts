import { describe, expect, it } from 'vitest';
import { hasPdfSignature, validatePdfFile } from './validateFile.ts';

describe('validatePdfFile', () => {
  it('przyjmuje PDF do 10 MB', () => {
    expect(() =>
      validatePdfFile({ name: 'a.pdf', type: 'application/pdf', size: 10 * 1024 * 1024 }),
    ).not.toThrow();
  });

  it('odrzuca inne typy, puste i zbyt duże pliki', () => {
    expect(() => validatePdfFile({ name: 'a.docx', type: 'application/msword', size: 10 })).toThrow(
      'tylko pliki PDF',
    );
    expect(() => validatePdfFile({ name: 'a.pdf', type: 'application/pdf', size: 0 })).toThrow(
      'pusty',
    );
    expect(() =>
      validatePdfFile({ name: 'a.pdf', type: 'application/pdf', size: 10 * 1024 * 1024 + 1 }),
    ).toThrow('maksymalny rozmiar');
  });
});

describe('hasPdfSignature', () => {
  const encode = (text: string) => new TextEncoder().encode(text);
  it('rozpoznaje nagłówek %PDF-', () => {
    expect(hasPdfSignature(encode('%PDF-1.7\n...'))).toBe(true);
    expect(hasPdfSignature(encode('\n\n%PDF-1.4'))).toBe(true);
    expect(hasPdfSignature(encode('<html>'))).toBe(false);
  });
});
