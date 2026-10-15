import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface Props {
  message: string;
  fileName: string | null;
  retryable: boolean;
  onRetry: () => void;
  onReset: () => void;
  /** Wybór modelu — przy błędach AI można spróbować innego modelu. */
  modelPicker?: ReactNode;
}

/** F-06: stan błędu z opcją ponowienia. */
export function ErrorView({ message, fileName, retryable, onRetry, onReset, modelPicker }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  const canRetry = retryable && fileName !== null;

  return (
    <section className="panel error" role="alert" aria-labelledby="error-title">
      <span className="label label--danger">Błąd</span>
      <h2 id="error-title" ref={headingRef} tabIndex={-1} className="heading">
        Nie udało się <span className="outline">przeanalizować</span>
      </h2>
      {fileName && <p className="file-name mono">{fileName}</p>}
      <p className="error__message">{message}</p>
      {canRetry && modelPicker}
      <div className="actions">
        {canRetry && (
          <button type="button" className="button button--primary" onClick={onRetry}>
            Spróbuj ponownie
          </button>
        )}
        <button
          type="button"
          className={`button ${canRetry ? 'button--ghost' : 'button--primary'}`}
          onClick={onReset}
        >
          Wybierz inny plik
        </button>
      </div>
    </section>
  );
}
