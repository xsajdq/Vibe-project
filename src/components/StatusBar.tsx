import type { ApiStatus } from '../lib/useApiStatus.ts';

interface Props {
  apiStatus: ApiStatus;
  model: string | null;
}

const STATUS_LABEL: Record<ApiStatus, string> = {
  checking: 'Sprawdzanie API…',
  online: 'Wszystkie systemy sprawne',
  offline: 'API niedostępne',
};

/** Pasek statusu w stylu terminala: dostępność backendu, model i limity. */
export function StatusBar({ apiStatus, model }: Props) {
  return (
    <footer className="statusbar">
      <span className={`statusbar__status statusbar__status--${apiStatus}`} role="status">
        <span className="dot" aria-hidden="true" />
        {STATUS_LABEL[apiStatus]}
      </span>
      <span>Model: {model ?? '—'}</span>
      <span>Limit: PDF ≤ 10 MB</span>
      <span className="statusbar__muted">Wyniki generuje AI — zweryfikuj je przed użyciem</span>
    </footer>
  );
}
