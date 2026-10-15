import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Insight } from '../../shared/schema.ts';
import { downloadJson } from '../lib/exportJson.ts';
import {
  DOCUMENT_TYPE_LABELS,
  formatAmount,
  formatDate,
  languageName,
  pagesLabel,
} from '../lib/format.ts';
import { JsonPreview } from './JsonPreview.tsx';

interface Props {
  insight: Insight;
  durationMs: number | null;
  onReset: () => void;
}

function Card({
  index,
  title,
  count,
  wide = false,
  children,
}: {
  index: number;
  title: string;
  count?: number;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`card${wide ? ' card--wide' : ''}`}>
      <h3 className="card__title">
        <span className="card__index mono">{String(index).padStart(2, '0')}</span>
        {title}
        {count !== undefined && <span className="badge mono">{count}</span>}
      </h3>
      {children}
    </section>
  );
}

function Empty() {
  return <p className="muted">Brak w dokumencie.</p>;
}

function TagList({ items }: { items: string[] }) {
  if (items.length === 0) return <Empty />;
  return (
    <ul className="tags">
      {items.map((item) => (
        <li key={item} className="tag">
          {item}
        </li>
      ))}
    </ul>
  );
}

/** F-05: czytelna prezentacja wyniku + podgląd i eksport JSON. */
export function ResultView({ insight, durationMs, onReset }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), [insight]);

  const { document: doc, meta } = insight;

  return (
    <div className="result">
      <section className="result__header" aria-labelledby="result-title">
        <ul className="chips mono" aria-label="Metadane dokumentu">
          <li className="chip chip--accent">{DOCUMENT_TYPE_LABELS[doc.type]}</li>
          <li className="chip">{pagesLabel(doc.pages)}</li>
          <li className="chip">{languageName(doc.language)}</li>
          {doc.date && <li className="chip">{formatDate(doc.date)}</li>}
          {durationMs !== null && (
            <li className="chip">{(durationMs / 1000).toFixed(1).replace('.', ',')} s</li>
          )}
          {meta && <li className="chip">{meta.model}</li>}
        </ul>
        <h2 id="result-title" ref={headingRef} tabIndex={-1} className="result__title">
          {doc.title ?? doc.fileName}
        </h2>
        {doc.title && <p className="file-name mono">{doc.fileName}</p>}
        <div className="summary">
          <span className="label">Podsumowanie</span>
          <p>{insight.summary}</p>
        </div>
        <div className="actions">
          <button
            type="button"
            className="button button--primary"
            onClick={() => downloadJson(insight)}
          >
            Pobierz JSON ↓
          </button>
          <button type="button" className="button button--ghost" onClick={onReset}>
            Analizuj kolejny
          </button>
        </div>
      </section>

      {meta && meta.warnings.length > 0 && (
        <section className="warnings" aria-label="Uwagi do analizy">
          <span className="label label--ink">Uwaga</span>
          <ul>
            {meta.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="section-head">
        <h2 className="heading">
          Wyodrębnione <span className="accent">dane</span>
        </h2>
      </div>

      <div className="grid">
        <Card index={1} title="Najważniejsze punkty" count={insight.keyPoints.length}>
          <ul className="list">
            {insight.keyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </Card>

        <Card index={2} title="Kwoty" count={insight.amounts.length}>
          {insight.amounts.length === 0 ? (
            <Empty />
          ) : (
            <div className="table-wrap" tabIndex={0} role="region" aria-label="Tabela kwot">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Kwota</th>
                    <th scope="col">Kontekst</th>
                  </tr>
                </thead>
                <tbody>
                  {insight.amounts.map((amount, index) => (
                    <tr key={`${amount.value}-${amount.currency}-${index}`}>
                      <td className="num">{formatAmount(amount.value, amount.currency)}</td>
                      <td>{amount.context}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card index={3} title="Daty" count={insight.dates.length}>
          {insight.dates.length === 0 ? (
            <Empty />
          ) : (
            <ul className="list list--dates">
              {insight.dates.map((entry, index) => (
                <li key={`${entry.date}-${index}`}>
                  <time dateTime={entry.date} className="date mono">
                    {entry.date}
                  </time>
                  <span>{entry.context}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card index={4} title="Podmioty">
          <h4 className="subheading">Organizacje</h4>
          <TagList items={insight.entities.organizations} />
          <h4 className="subheading">Osoby</h4>
          <TagList items={insight.entities.people} />
        </Card>

        <Card index={5} title="Słowa kluczowe" count={insight.keywords.length} wide>
          <TagList items={insight.keywords} />
        </Card>
      </div>

      <JsonPreview insight={insight} />
    </div>
  );
}
