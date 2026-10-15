import { useState } from 'react';
import type { Insight } from '../../shared/schema.ts';
import { toJson } from '../lib/exportJson.ts';

/** F-05: podgląd JSON — zwykły tekst w <pre>, bez wstrzykiwania HTML. */
export function JsonPreview({ insight }: { insight: Insight }) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const json = toJson(insight);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
    window.setTimeout(() => setCopied('idle'), 2000);
  };

  return (
    <details className="json-preview">
      <summary>Podgląd JSON</summary>
      <div className="json-preview__toolbar">
        <button
          type="button"
          className="button button--ghost button--small"
          onClick={() => void copy()}
        >
          {copied === 'ok'
            ? 'Skopiowano'
            : copied === 'fail'
              ? 'Nie udało się skopiować'
              : 'Kopiuj JSON'}
        </button>
      </div>
      <pre className="json-preview__code" tabIndex={0} aria-label="Wynik analizy w formacie JSON">
        <code>{json}</code>
      </pre>
    </details>
  );
}
