import { useCallback, useRef, useState } from 'react';
import type { Insight } from '../../shared/schema.ts';
import { analyzeDocument } from '../api/client.ts';
import { toUserMessage } from './errors.ts';
import { extractPdf } from './pdf.ts';
import { validatePdfFile } from './validateFile.ts';

export type Step = 'read' | 'ocr' | 'analyze';

export type AnalysisState =
  | { status: 'idle' }
  | { status: 'working'; fileName: string; step: Step; detail: string; startedAt: number }
  | { status: 'error'; fileName: string | null; message: string; retryable: boolean }
  | { status: 'done'; insight: Insight; durationMs: number | null };

export function useAnalysis(onSuccess: (insight: Insight) => void) {
  const [state, setState] = useState<AnalysisState>({ status: 'idle' });
  const lastFile = useRef<File | null>(null);
  const controller = useRef<AbortController | null>(null);

  const run = useCallback(
    async (file: File) => {
      controller.current?.abort();
      const abort = new AbortController();
      controller.current = abort;
      lastFile.current = file;
      const startedAt = Date.now();
      const update = (step: Step, detail: string) => {
        if (!abort.signal.aborted) {
          setState({ status: 'working', fileName: file.name, step, detail, startedAt });
        }
      };

      try {
        validatePdfFile(file);
        update('read', 'Wczytywanie pliku…');

        const extracted = await extractPdf(file, (progress) => {
          if (progress.phase === 'text') {
            update('read', `Strona ${progress.page} z ${progress.total}`);
          } else {
            update(
              'ocr',
              `Przygotowanie skanu strony ${progress.page} (${progress.done + 1}/${progress.total})`,
            );
          }
        });
        if (abort.signal.aborted) return;

        update(
          'analyze',
          extracted.scans.length > 0
            ? 'Podsumowanie, ekstrakcja danych i OCR skanów…'
            : 'Podsumowanie i ekstrakcja danych…',
        );
        const insight = await analyzeDocument(
          {
            fileName: file.name,
            pageCount: extracted.pageCount,
            pages: extracted.pages,
            scans: extracted.scans,
          },
          abort.signal,
        );
        if (abort.signal.aborted) return;

        const withWarnings: Insight =
          extracted.warnings.length > 0 && insight.meta
            ? {
                ...insight,
                meta: {
                  ...insight.meta,
                  warnings: [...extracted.warnings, ...insight.meta.warnings],
                },
              }
            : insight;

        setState({ status: 'done', insight: withWarnings, durationMs: Date.now() - startedAt });
        onSuccess(withWarnings);
      } catch (error) {
        if (abort.signal.aborted) return;
        const { message, retryable } = toUserMessage(error);
        setState({ status: 'error', fileName: file.name, message, retryable });
      }
    },
    [onSuccess],
  );

  const retry = useCallback(() => {
    if (lastFile.current) void run(lastFile.current);
  }, [run]);

  const reset = useCallback(() => {
    controller.current?.abort();
    lastFile.current = null;
    setState({ status: 'idle' });
  }, []);

  const reject = useCallback((message: string) => {
    setState({ status: 'error', fileName: null, message, retryable: false });
  }, []);

  const show = useCallback((insight: Insight) => {
    controller.current?.abort();
    setState({ status: 'done', insight, durationMs: null });
  }, []);

  return { state, analyze: run, retry, reset, reject, show };
}
