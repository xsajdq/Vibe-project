import { useCallback, useState } from 'react';
import type { Insight } from '../shared/schema.ts';
import { Dropzone } from './components/Dropzone.tsx';
import { ErrorView } from './components/ErrorView.tsx';
import { HistoryList } from './components/HistoryList.tsx';
import { PrivacyNotice } from './components/PrivacyNotice.tsx';
import { ProgressView } from './components/ProgressView.tsx';
import { ResultView } from './components/ResultView.tsx';
import { addToHistory, clearHistory, loadHistory, removeFromHistory } from './lib/history.ts';
import { useAnalysis } from './lib/useAnalysis.ts';

export function App() {
  const [history, setHistory] = useState(() => loadHistory());
  const onSuccess = useCallback((insight: Insight) => setHistory(addToHistory(insight)), []);
  const { state, analyze, retry, reset, reject, show } = useAnalysis(onSuccess);

  return (
    <>
      <a className="skip-link" href="#main">
        Przejdź do treści
      </a>
      <header className="app-header">
        <div className="container app-header__inner">
          <button
            type="button"
            className="brand"
            onClick={reset}
            aria-label="PDF Insight — strona główna"
          >
            <span className="brand__mark" aria-hidden="true">
              PI
            </span>
            PDF Insight
          </button>
          <span className="muted app-header__tagline">
            Podsumowanie i dane z PDF w kilka sekund
          </span>
        </div>
      </header>

      <main id="main" className="container main">
        {state.status === 'idle' && (
          <>
            <section className="intro">
              <h1>Wgraj PDF — otrzymasz podsumowanie i dane w JSON</h1>
              <p className="muted">
                Aplikacja odczyta tekst dokumentu, przygotuje krótkie podsumowanie i wyodrębni
                podmioty, kwoty, daty oraz słowa kluczowe. Wynik pobierzesz jako plik .json.
              </p>
            </section>
            <Dropzone onFile={(file) => void analyze(file)} onReject={reject} />
            <PrivacyNotice />
            <HistoryList
              entries={history}
              onOpen={(entry) => show(entry.insight)}
              onRemove={(id) => setHistory(removeFromHistory(id))}
              onClear={() => setHistory(clearHistory())}
            />
          </>
        )}

        {state.status === 'working' && (
          <ProgressView
            fileName={state.fileName}
            step={state.step}
            detail={state.detail}
            startedAt={state.startedAt}
            onCancel={reset}
          />
        )}

        {state.status === 'error' && (
          <ErrorView
            message={state.message}
            fileName={state.fileName}
            retryable={state.retryable}
            onRetry={retry}
            onReset={reset}
          />
        )}

        {state.status === 'done' && (
          <ResultView insight={state.insight} durationMs={state.durationMs} onReset={reset} />
        )}
      </main>

      <footer className="container app-footer muted">
        PDF Insight · zadanie rekrutacyjne Vibe Coder · wyniki generuje AI — zweryfikuj je przed
        użyciem
      </footer>
    </>
  );
}
