import { LIMITS } from '../../shared/api.ts';
import { AppError } from './errors.ts';

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/** Szybka walidacja przed odczytem: rozszerzenie/typ MIME i rozmiar (F-01). */
export function validatePdfFile(file: Pick<File, 'name' | 'type' | 'size'>): void {
  const looksLikePdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!looksLikePdf) {
    throw new AppError('Obsługiwane są tylko pliki PDF.', false);
  }
  if (file.size === 0) {
    throw new AppError('Plik jest pusty.', false);
  }
  if (file.size > LIMITS.maxFileBytes) {
    throw new AppError(
      `Plik ma ${formatBytes(file.size)} — maksymalny rozmiar to ${formatBytes(LIMITS.maxFileBytes)}.`,
      false,
    );
  }
}

/** Weryfikacja sygnatury pliku — rozszerzenie można podmienić, nagłówka %PDF- już nie. */
export function hasPdfSignature(bytes: Uint8Array): boolean {
  const header = '%PDF-';
  // Specyfikacja dopuszcza śmieci przed nagłówkiem — szukamy w pierwszym 1 KB.
  const limit = Math.min(bytes.length - header.length, 1024);
  for (let offset = 0; offset <= limit; offset += 1) {
    let match = true;
    for (let i = 0; i < header.length; i += 1) {
      if (bytes[offset + i] !== header.charCodeAt(i)) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}
