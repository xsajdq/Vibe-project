import type { Insight } from '../../shared/schema.ts';

export function toJson(insight: Insight): string {
  return JSON.stringify(insight, null, 2);
}

export function exportFileName(sourceName: string): string {
  const base = sourceName.replace(/\.pdf$/i, '').replace(/[^\p{L}\p{N}._-]+/gu, '_') || 'dokument';
  return `${base}.insight.json`;
}

/** F-05: pobranie wyniku jako plik .json (Blob + tymczasowy link). */
export function downloadJson(insight: Insight): void {
  const blob = new Blob([toJson(insight)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = exportFileName(insight.document.fileName);
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
