import { useEffect, useState } from 'react';
import type { Step } from '../lib/useAnalysis.ts';

interface Props {
  fileName: string;
  step: Step;
  detail: string;
  startedAt: number;
  model: string | null;
  onCancel: () => void;
}

const STEPS: { id: Step; label: string }[] = [
  { id: 'read', label: 'Odczyt tekstu' },
  { id: 'ocr', label: 'Przygotowanie skanów' },
  { id: 'analyze', label: 'Analiza AI' },
];

/** F-06: stan ładowania z krokami przepływu i licznikiem czasu. */
export function ProgressView({ fileName, step, detail, startedAt, model, onCancel }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);

  const currentIndex = STEPS.findIndex((s) => s.id === step);
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));

  return (
    <section className="terminal progress" aria-busy="true" aria-labelledby="progress-title">
      <div className="terminal__bar">
        <span className="terminal__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="file-name">{fileName}</span>
        <span className="progress__timer" aria-label={`Upłynęło ${seconds} sekund`}>
          {seconds}s
        </span>
      </div>
      <div className="terminal__body">
        <h2 id="progress-title" className="heading">
          Analizuję <span className="accent">dokument</span>
        </h2>
        <ol className="steps mono">
          {STEPS.map((s, index) => {
            const status =
              index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo';
            return (
              <li key={s.id} className={`steps__item steps__item--${status}`}>
                <span aria-hidden="true">
                  {status === 'done' ? '[✓]' : status === 'current' ? '[›]' : '[ ]'}
                </span>{' '}
                {s.label}
                {status === 'current' && <span className="visually-hidden"> (w toku)</span>}
              </li>
            );
          })}
        </ol>
        <p className="progress__detail mono" role="status" aria-live="polite">
          <span className="accent">$</span> {detail}
          <span className="cursor" aria-hidden="true" />
        </p>
        <p className="hint">Model: {model ?? 'automatycznie'}</p>
        <div className="actions">
          <button type="button" className="button button--ghost" onClick={onCancel}>
            Anuluj
          </button>
        </div>
      </div>
    </section>
  );
}
