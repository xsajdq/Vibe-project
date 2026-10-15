import type { HistoryEntry } from '../lib/history.ts';
import { DOCUMENT_TYPE_LABELS, formatDateTime } from '../lib/format.ts';

interface Props {
  entries: HistoryEntry[];
  onOpen: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

/** F-09: ostatnie analizy zapisane w localStorage. */
export function HistoryList({ entries, onOpen, onRemove, onClear }: Props) {
  if (entries.length === 0) return null;

  return (
    <section className="card history" aria-labelledby="history-title">
      <div className="history__header">
        <h2 id="history-title" className="section__title">
          Ostatnie analizy
        </h2>
        <button type="button" className="button button--ghost button--small" onClick={onClear}>
          Wyczyść historię
        </button>
      </div>
      <ul className="history__list">
        {entries.map((entry) => (
          <li key={entry.id} className="history__item">
            <button type="button" className="history__open" onClick={() => onOpen(entry)}>
              <span className="history__name">
                {entry.insight.document.title ?? entry.insight.document.fileName}
              </span>
              <span className="muted history__details">
                {DOCUMENT_TYPE_LABELS[entry.insight.document.type]} ·{' '}
                {entry.insight.document.fileName} · {formatDateTime(entry.savedAt)}
              </span>
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => onRemove(entry.id)}
              aria-label={`Usuń z historii: ${entry.insight.document.fileName}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
