import { useEffect, useState } from 'react';
import { fetchModels } from '../api/client.ts';

const STORAGE_KEY = 'pdf-insight:model';

function readStored(): string | null {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Lista modeli z backendu + wybór użytkownika zapamiętany w localStorage.
 * `selected === null` oznacza tryb automatyczny (model domyślny + zapasowe).
 */
export function useModels() {
  const [models, setModels] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(readStored);

  useEffect(() => {
    const controller = new AbortController();
    fetchModels(controller.signal)
      .then(setModels)
      .catch(() => setModels([]));
    return () => controller.abort();
  }, []);

  // Wybór spoza aktualnej listy (np. model wycofany z konfiguracji) → automatycznie.
  const effective = selected && models.includes(selected) ? selected : null;

  const select = (model: string | null) => {
    setSelected(model);
    try {
      if (model) globalThis.localStorage?.setItem(STORAGE_KEY, model);
      else globalThis.localStorage?.removeItem(STORAGE_KEY);
    } catch {
      // tryb prywatny — wybór działa do odświeżenia strony
    }
  };

  return { models, selected: effective, select };
}
