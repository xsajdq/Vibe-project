import { useEffect, useState } from 'react';
import type { Step } from '../lib/useAnalysis.ts';

interface Props {
  fileName: string;
  step: Step;
  detail: string;
  startedAt: number;
  onCancel: () => void;
}

const STEPS: { id: Step; label: string }[] = [
  { id: 'read', label: 'Odczyt tekstu' },
  { id: 'ocr', label: 'Przygotowanie skanów' },
  { id: 'analyze', label: 'Analiza AI' },
];

/** F-06: stan ładowania z krokami przepływu i licznikiem czasu. */
export function ProgressView({ fileName, step, detail, startedAt, onCancel }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);

  const currentIndex = STEPS.findIndex((s) => s.id === step);
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));

  return (
    <section className="card progress" aria-busy="true" aria-labelledby="progress-title">
      <div className="progress__header">
        <span className="spinner" aria-hidden="true" />
        <div>
          <h2 id="progress-title" className="progress__title">
            Analizuję dokument
          </h2>
          <p className="muted file-name">{fileName}</p>
        </div>
        <span className="progress__timer" aria-label={`Upłynęło ${seconds} sekund`}>
          {seconds} s
        </span>
      </div>
      <ol className="steps">
        {STEPS.map((s, index) => {
          const status =
            index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo';
          return (
            <li key={s.id} className={`steps__item steps__item--${status}`}>
              <span className="steps__marker" aria-hidden="true">
                {status === 'done' ? '✓' : index + 1}
              </span>
              <span>
                {s.label}
                {status === 'current' && <span className="visually-hidden"> (w toku)</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="progress__detail" role="status" aria-live="polite">
        {detail}
      </p>
      <button type="button" className="button button--ghost" onClick={onCancel}>
        Anuluj
      </button>
    </section>
  );
}
