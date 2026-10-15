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
    <section className="history" aria-labelledby="history-title">
      <div className="section-head">
        <h2 id="history-title" className="heading">
          Ostatnie <span className="accent">analizy</span>
        </h2>
        <button type="button" className="button button--ghost button--small" onClick={onClear}>
          Wyczyść historię
        </button>
      </div>
      <ul className="history__list">
        {entries.map((entry, index) => (
          <li key={entry.id} className="history__item">
            <span className="history__index mono" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <button type="button" className="history__open" onClick={() => onOpen(entry)}>
              <span className="history__name">
                {entry.insight.document.title ?? entry.insight.document.fileName}
              </span>
              <span className="history__details mono">
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
