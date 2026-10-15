import { useEffect, useState } from 'react';
import { checkHealth } from '../api/client.ts';

export type ApiStatus = 'checking' | 'online' | 'offline';

/** Sprawdza dostępność backendu przy starcie i co minutę (pasek statusu). */
export function useApiStatus(): ApiStatus {
  const [status, setStatus] = useState<ApiStatus>('checking');

  useEffect(() => {
    let active = true;
    const check = () => {
      checkHealth(AbortSignal.timeout(10_000)).then(
        (ok) => {
          if (active) setStatus(ok ? 'online' : 'offline');
        },
        () => {
          if (active) setStatus('offline');
        },
      );
    };
    check();
    const timer = window.setInterval(check, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return status;
}
