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

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="card section">
      <h3 className="section__title">
        {title}
        {count !== undefined && <span className="badge">{count}</span>}
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
      <section className="card result__header" aria-labelledby="result-title">
        <div className="result__meta">
          <span className="pill">{DOCUMENT_TYPE_LABELS[doc.type]}</span>
          <span className="muted">
            {pagesLabel(doc.pages)}
            {' · '}
            {languageName(doc.language)}
            {doc.date && <> · {formatDate(doc.date)}</>}
            {durationMs !== null && (
              <> · analiza {(durationMs / 1000).toFixed(1).replace('.', ',')} s</>
            )}
          </span>
        </div>
        <h2 id="result-title" ref={headingRef} tabIndex={-1} className="result__title">
          {doc.title ?? doc.fileName}
        </h2>
        {doc.title && <p className="muted file-name">{doc.fileName}</p>}
        <p className="summary">{insight.summary}</p>
        <div className="actions">
          <button
            type="button"
            className="button button--primary"
            onClick={() => downloadJson(insight)}
          >
            Pobierz JSON
          </button>
          <button type="button" className="button button--ghost" onClick={onReset}>
            Analizuj kolejny plik
          </button>
        </div>
      </section>

      {meta && meta.warnings.length > 0 && (
        <section className="card warnings" aria-label="Uwagi do analizy">
          <ul>
            {meta.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid">
        <Section title="Najważniejsze punkty" count={insight.keyPoints.length}>
          <ul className="list">
            {insight.keyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </Section>

        <Section title="Kwoty" count={insight.amounts.length}>
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
        </Section>

        <Section title="Daty" count={insight.dates.length}>
          {insight.dates.length === 0 ? (
            <Empty />
          ) : (
            <ul className="list list--dates">
              {insight.dates.map((entry, index) => (
                <li key={`${entry.date}-${index}`}>
                  <time dateTime={entry.date} className="date">
                    {formatDate(entry.date)}
                  </time>
                  <span>{entry.context}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Podmioty">
          <h4 className="subheading">Organizacje</h4>
          <TagList items={insight.entities.organizations} />
          <h4 className="subheading">Osoby</h4>
          <TagList items={insight.entities.people} />
        </Section>

        <Section title="Słowa kluczowe" count={insight.keywords.length}>
          <TagList items={insight.keywords} />
        </Section>
      </div>

      <JsonPreview insight={insight} />
    </div>
  );
}
