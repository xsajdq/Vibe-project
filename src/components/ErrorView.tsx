import { useEffect, useRef } from 'react';

interface Props {
  message: string;
  fileName: string | null;
  retryable: boolean;
  onRetry: () => void;
  onReset: () => void;
}

/** F-06: stan błędu z opcją ponowienia. */
export function ErrorView({ message, fileName, retryable, onRetry, onReset }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <section className="card error" role="alert" aria-labelledby="error-title">
      <h2 id="error-title" ref={headingRef} tabIndex={-1} className="error__title">
        Nie udało się przeanalizować dokumentu
      </h2>
      {fileName && <p className="muted file-name">{fileName}</p>}
      <p className="error__message">{message}</p>
      <div className="actions">
        {retryable && fileName && (
          <button type="button" className="button button--primary" onClick={onRetry}>
            Spróbuj ponownie
          </button>
        )}
        <button
          type="button"
          className={`button ${retryable && fileName ? 'button--ghost' : 'button--primary'}`}
          onClick={onReset}
        >
          Wybierz inny plik
        </button>
      </div>
    </section>
  );
}
