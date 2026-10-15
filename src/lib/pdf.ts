import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import { LIMITS } from '../../shared/api.ts';
import type { PageText, Scan } from '../../shared/api.ts';
import { AppError } from './errors.ts';
import { hasPdfSignature } from './validateFile.ts';

export interface ExtractedPdf {
  pageCount: number;
  pages: PageText[];
  scans: Scan[];
  warnings: string[];
}

export type ExtractProgress =
  | { phase: 'text'; page: number; total: number }
  | { phase: 'ocr'; page: number; done: number; total: number };

/** Strona z mniej niż tyloma znakami (bez białych) traktowana jest jako skan bez warstwy tekstowej. */
const MIN_TEXT_CHARS = 25;
const SCAN_MAX_WIDTH_PX = 1400;

async function loadPdfJs() {
  // Import dynamiczny: pdf.js (~1 MB) ładuje się dopiero po wybraniu pliku.
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    // Vite kopiuje plik workera do dist/assets i zwraca URL z poprawnym `base` (GitHub Pages).
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

function isTextItem(item: unknown): item is TextItem {
  return typeof item === 'object' && item !== null && 'str' in item;
}

/**
 * Skleja fragmenty tekstu z pdf.js. Spację wstawiamy tylko wtedy, gdy między fragmentami
 * jest faktyczna przerwa w poziomie — inaczej słowa z polskimi znakami, które pdf.js
 * zwraca jako osobne fragmenty („wy” + „łą” + „cznie”), rozpadłyby się na części.
 */
export function joinTextItems(items: readonly TextItem[]): string {
  let text = '';
  let previous: TextItem | null = null;
  for (const item of items) {
    if (
      previous &&
      !previous.hasEOL &&
      text.length > 0 &&
      !/\s$/.test(text) &&
      !/^\s/.test(item.str)
    ) {
      const previousEnd = (previous.transform[4] ?? 0) + previous.width;
      const gap = (item.transform[4] ?? 0) - previousEnd;
      const fontSize = Math.abs(item.transform[0] ?? 0) || item.height || 10;
      const sameLine =
        Math.abs((item.transform[5] ?? 0) - (previous.transform[5] ?? 0)) < fontSize * 0.5;
      if (!sameLine || gap > fontSize * 0.15) text += ' ';
    }
    text += item.str;
    if (item.hasEOL) text += '\n';
    previous = item;
  }
  return text;
}

async function readPageText(page: PDFPageProxy): Promise<string> {
  const content = await page.getTextContent();
  return joinTextItems(content.items.filter(isTextItem))
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function renderPageToJpeg(page: PDFPageProxy): Promise<string> {
  const base = page.getViewport({ scale: 1 });
  let scale = Math.min(2, SCAN_MAX_WIDTH_PX / base.width);
  let quality = 0.75;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) throw new AppError('Przeglądarka nie obsługuje renderowania stron PDF.', false);
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    canvas.width = 0;
    canvas.height = 0;
    if (dataUrl.length <= LIMITS.maxImageChars) return dataUrl;
    scale *= 0.75;
    quality -= 0.1;
  }
  throw new AppError('Nie udało się przygotować skanu strony do OCR.', true);
}

async function openDocument(data: Uint8Array): Promise<PDFDocumentProxy> {
  const pdfjs = await loadPdfJs();
  try {
    // isEvalSupported: false — pdf.js nie wykona kodu JS osadzonego w czcionkach PDF.
    return await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    if (name === 'PasswordException') {
      throw new AppError(
        'Plik PDF jest zabezpieczony hasłem — usuń hasło i spróbuj ponownie.',
        false,
      );
    }
    throw new AppError(
      'Nie udało się odczytać pliku — może być uszkodzony lub nie jest PDF-em.',
      false,
    );
  }
}

/**
 * Odczytuje tekst każdej strony (F-02). Strony bez warstwy tekstowej (skany) renderuje
 * do JPEG, aby model AI wykonał OCR (F-10) — maks. LIMITS.maxScanPages stron.
 */
export async function extractPdf(
  file: File,
  onProgress: (progress: ExtractProgress) => void,
): Promise<ExtractedPdf> {
  const data = new Uint8Array(await file.arrayBuffer());
  if (!hasPdfSignature(data)) {
    throw new AppError('Plik nie jest prawidłowym dokumentem PDF.', false);
  }

  const pdf = await openDocument(data);
  try {
    const pages: PageText[] = [];
    const scanCandidates: number[] = [];
    let totalChars = 0;
    let truncated = false;

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      onProgress({ phase: 'text', page: pageNumber, total: pdf.numPages });
      const page = await pdf.getPage(pageNumber);
      let text = await readPageText(page);
      page.cleanup();

      if (text.replace(/\s/g, '').length < MIN_TEXT_CHARS) {
        scanCandidates.push(pageNumber);
        text = '';
      }
      if (totalChars + text.length > LIMITS.maxTextChars) {
        text = text.slice(0, Math.max(0, LIMITS.maxTextChars - totalChars));
        truncated = true;
      }
      totalChars += text.length;
      pages.push({ page: pageNumber, text });
    }

    const warnings: string[] = [];
    if (truncated) {
      warnings.push(
        `Dokument jest bardzo długi — przeanalizowano pierwsze ${LIMITS.maxTextChars.toLocaleString('pl-PL')} znaków.`,
      );
    }

    const toOcr = scanCandidates.slice(0, LIMITS.maxScanPages);
    const skipped = scanCandidates.slice(LIMITS.maxScanPages);
    if (skipped.length > 0) {
      warnings.push(
        `Pominięto OCR stron ${skipped.join(', ')} (limit ${LIMITS.maxScanPages} stron-skanów na dokument).`,
      );
    }

    const scans: Scan[] = [];
    for (const [index, pageNumber] of toOcr.entries()) {
      onProgress({ phase: 'ocr', page: pageNumber, done: index, total: toOcr.length });
      const page = await pdf.getPage(pageNumber);
      scans.push({ page: pageNumber, image: await renderPageToJpeg(page) });
      page.cleanup();
    }

    if (totalChars === 0 && scans.length === 0) {
      throw new AppError('Ten PDF nie zawiera tekstu do analizy.', false);
    }

    return { pageCount: pdf.numPages, pages, scans, warnings };
  } finally {
    void pdf.destroy();
  }
}
