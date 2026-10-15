import { z } from 'zod';
import { insightSchema } from '../../shared/schema.ts';
import type { Insight } from '../../shared/schema.ts';

/** F-09: ostatnie wyniki zapisane lokalnie w przeglądarce (tylko wynik — bez treści PDF). */

const STORAGE_KEY = 'pdf-insight:history:v1';
export const HISTORY_LIMIT = 10;

const entrySchema = z.object({
  id: z.string(),
  savedAt: z.string(),
  insight: insightSchema,
});

export type HistoryEntry = z.infer<typeof entrySchema>;

export function loadHistory(
  storage: Storage | undefined = globalThis.localStorage,
): HistoryEntry[] {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Uszkodzone lub nieaktualne wpisy pomijamy zamiast psuć całą historię.
    return parsed.flatMap((item) => {
      const result = entrySchema.safeParse(item);
      return result.success ? [result.data] : [];
    });
  } catch {
    return [];
  }
}

function persist(entries: HistoryEntry[], storage: Storage | undefined): HistoryEntry[] {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Brak miejsca / tryb prywatny — historia jest dodatkiem, aplikacja działa bez niej.
  }
  return entries;
}

export function addToHistory(
  insight: Insight,
  storage: Storage | undefined = globalThis.localStorage,
  now = new Date(),
): HistoryEntry[] {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : String(now.getTime());
  const entry: HistoryEntry = { id, savedAt: now.toISOString(), insight };
  return persist([entry, ...loadHistory(storage)].slice(0, HISTORY_LIMIT), storage);
}

export function removeFromHistory(
  id: string,
  storage: Storage | undefined = globalThis.localStorage,
): HistoryEntry[] {
  return persist(
    loadHistory(storage).filter((entry) => entry.id !== id),
    storage,
  );
}

export function clearHistory(
  storage: Storage | undefined = globalThis.localStorage,
): HistoryEntry[] {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // ignorujemy — patrz persist()
  }
  return [];
}
