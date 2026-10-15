import { useEffect, useState } from 'react';
import { DEFAULT_MODELS } from '../../shared/api.ts';
import { fetchModels } from '../api/client.ts';
import type { ApiStatus } from './useApiStatus.ts';

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
export function useModels(apiStatus: ApiStatus) {
  const [models, setModels] = useState<string[]>(DEFAULT_MODELS);
  const [fromApi, setFromApi] = useState(false);
  const [selected, setSelected] = useState<string | null>(readStored);

  // Lista z backendu pobierana, gdy API jest osiągalne (także po powrocie połączenia).
  useEffect(() => {
    if (apiStatus !== 'online' || fromApi) return;
    const controller = new AbortController();
    fetchModels(controller.signal).then(
      (list) => {
        setModels(list);
        setFromApi(true);
      },
      () => undefined, // zostaje lista domyślna
    );
    return () => controller.abort();
  }, [apiStatus, fromApi]);

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

  return { models, fromApi, selected: effective, select };
}
