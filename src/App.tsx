import { useCallback, useState } from 'react';
import type { Insight } from '../shared/schema.ts';
import { Dropzone } from './components/Dropzone.tsx';
import { ErrorView } from './components/ErrorView.tsx';
import { HistoryList } from './components/HistoryList.tsx';
import { ModelPicker } from './components/ModelPicker.tsx';
import { PrivacyNotice } from './components/PrivacyNotice.tsx';
import { ProgressView } from './components/ProgressView.tsx';
import { ResultView } from './components/ResultView.tsx';
import { StatusBar } from './components/StatusBar.tsx';
import { addToHistory, clearHistory, loadHistory, removeFromHistory } from './lib/history.ts';
import { useAnalysis } from './lib/useAnalysis.ts';
import { useApiStatus } from './lib/useApiStatus.ts';
import { useModels } from './lib/useModels.ts';

export function App() {
  const [history, setHistory] = useState(() => loadHistory());
  const onSuccess = useCallback((insight: Insight) => setHistory(addToHistory(insight)), []);
  const apiStatus = useApiStatus();
  const { models, fromApi, selected, select } = useModels(apiStatus);
  const { state, analyze, retry, reset, reject, show } = useAnalysis(onSuccess, selected);

  const picker = (
    <ModelPicker models={models} selected={selected} onSelect={select} fromApi={fromApi} />
  );

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Przejdź do treści
      </a>

      <aside className="rail" aria-hidden="true">
        <span className="rail__brand">PDF Insight</span>
        <span className="rail__line" />
        <span className="rail__label">Vibe Coder</span>
      </aside>

      <div className="stage">
        <header className="topbar">
          <button type="button" className="brand" onClick={reset}>
            <span className="brand__mark" aria-hidden="true">
              PI
            </span>
            <span>PDF Insight</span>
          </button>
          <span className="topbar__tag">PDF → podsumowanie → JSON</span>
        </header>

        <main id="main" className="main">
          {state.status === 'idle' && (
            <>
              <section className="hero" aria-labelledby="hero-title">
                <div className="hero__text">
                  <h1 id="hero-title" className="display">
                    <span>PDF</span>
                    <span className="display__outline">Insight</span>
                  </h1>
                  <p className="hero__lead">
                    Podsumowanie i dane strukturalne
                    <br />z dowolnego PDF w kilka sekund
                  </p>
                  <p className="hero__desc">
                    Odczytamy tekst dokumentu, przygotujemy krótkie podsumowanie i wyodrębnimy
                    podmioty, kwoty, daty oraz słowa kluczowe. Wynik pobierzesz jako plik .json.
                  </p>
                </div>
                <div className="hero__panel">
                  <Dropzone onFile={(file) => void analyze(file)} onReject={reject} />
                  {picker}
                </div>
              </section>

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
              model={selected}
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
              modelPicker={state.retryable && models.length > 1 ? picker : null}
            />
          )}

          {state.status === 'done' && (
            <ResultView insight={state.insight} durationMs={state.durationMs} onReset={reset} />
          )}
        </main>

        <div className="band" aria-hidden="true">
          <div className="band__track">
            {Array.from({ length: 2 }, (_, i) => (
              <span key={i}>
                Podsumowanie <i>✦</i> Dane strukturalne <i>✦</i> Eksport JSON <i>✦</i> OCR skanów{' '}
                <i>✦</i> Walidacja schematu <i>✦</i>{' '}
              </span>
            ))}
          </div>
        </div>

        <StatusBar apiStatus={apiStatus} model={selected ?? models[0] ?? null} />
      </div>
    </div>
  );
}
