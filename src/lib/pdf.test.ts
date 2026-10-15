import { describe, expect, it } from 'vitest';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import { joinTextItems } from './pdf.ts';

function item(str: string, x: number, width: number, y = 100, hasEOL = false): TextItem {
  return {
    str,
    dir: 'ltr',
    width,
    height: 10,
    transform: [10, 0, 0, 10, x, y],
    fontName: 'f',
    hasEOL,
  };
}

describe('joinTextItems', () => {
  it('skleja przylegające fragmenty słowa z polskimi znakami', () => {
    expect(joinTextItems([item('wy', 0, 12), item('łą', 12, 10), item('cznie', 22, 25)])).toBe(
      'wyłącznie',
    );
  });

  it('wstawia spację, gdy między fragmentami jest przerwa', () => {
    expect(joinTextItems([item('Etap', 0, 20), item('E1', 40, 10)])).toBe('Etap E1');
  });

  it('respektuje końce linii i nowe wiersze', () => {
    expect(joinTextItems([item('Linia 1', 0, 30, 100, true), item('Linia 2', 0, 30, 85)])).toBe(
      'Linia 1\nLinia 2',
    );
    expect(joinTextItems([item('A', 0, 5, 100), item('B', 0, 5, 80)])).toBe('A B');
  });
});
