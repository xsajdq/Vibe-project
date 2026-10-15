import { describe, expect, it } from 'vitest';
import { validInsight } from '../../shared/__fixtures__/validInsight.ts';
import {
  HISTORY_LIMIT,
  addToHistory,
  clearHistory,
  loadHistory,
  removeFromHistory,
} from './history.ts';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

describe('history', () => {
  it('dodaje, usuwa i czyści wpisy', () => {
    const storage = memoryStorage();
    const [entry] = addToHistory(validInsight(), storage);
    expect(loadHistory(storage)).toHaveLength(1);
    removeFromHistory(entry?.id ?? '', storage);
    expect(loadHistory(storage)).toHaveLength(0);
    addToHistory(validInsight(), storage);
    clearHistory(storage);
    expect(loadHistory(storage)).toEqual([]);
  });

  it(`przechowuje maks. ${HISTORY_LIMIT} ostatnich wyników`, () => {
    const storage = memoryStorage();
    for (let i = 0; i < HISTORY_LIMIT + 3; i += 1) addToHistory(validInsight(), storage);
    expect(loadHistory(storage)).toHaveLength(HISTORY_LIMIT);
  });

  it('pomija uszkodzone wpisy i niepoprawny JSON', () => {
    const storage = memoryStorage();
    storage.setItem('pdf-insight:history:v1', '{nie json');
    expect(loadHistory(storage)).toEqual([]);
    storage.setItem(
      'pdf-insight:history:v1',
      JSON.stringify([{ id: 'x', savedAt: 'y', insight: { summary: 1 } }]),
    );
    expect(loadHistory(storage)).toEqual([]);
  });
});
