import { describe, expect, it } from 'vitest';
import { chunkPages } from './chunk.ts';

describe('chunkPages', () => {
  it('trzyma krótki dokument w jednym fragmencie i pomija puste strony', () => {
    const chunks = chunkPages([
      { page: 1, text: 'abc' },
      { page: 2, text: '   ' },
      { page: 3, text: 'def' },
    ]);
    expect(chunks).toEqual([
      [
        { page: 1, text: 'abc' },
        { page: 3, text: 'def' },
      ],
    ]);
  });

  it('dzieli po granicach stron, gdy przekroczono limit', () => {
    const pages = [1, 2, 3].map((page) => ({ page, text: 'x'.repeat(40) }));
    const chunks = chunkPages(pages, 100);
    expect(chunks.map((chunk) => chunk.map((p) => p.page))).toEqual([[1, 2], [3]]);
  });

  it('dzieli zbyt długą pojedynczą stronę na części', () => {
    const chunks = chunkPages([{ page: 7, text: 'y'.repeat(250) }], 100);
    expect(chunks).toHaveLength(3);
    expect(chunks.every((chunk) => chunk[0]?.page === 7)).toBe(true);
    expect(chunks.map((chunk) => chunk[0]?.text.length)).toEqual([100, 100, 50]);
  });

  it('zwraca pustą listę dla dokumentu bez tekstu', () => {
    expect(chunkPages([{ page: 1, text: '' }])).toEqual([]);
  });
});
