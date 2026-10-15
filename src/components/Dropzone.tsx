import { useId, useRef, useState } from 'react';
import type { DragEvent, KeyboardEvent } from 'react';
import { LIMITS } from '../../shared/api.ts';
import { formatBytes } from '../lib/validateFile.ts';

interface Props {
  onFile: (file: File) => void;
  onReject: (message: string) => void;
  disabled?: boolean;
}

/** F-01: wybór pliku przez drag & drop, kliknięcie lub klawiaturę (Enter / Spacja). */
export function Dropzone({ onFile, onReject, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [dragging, setDragging] = useState(false);

  const pick = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (files.length > 1) {
      onReject('Wybierz jeden plik PDF naraz.');
      return;
    }
    const file = files[0];
    if (file) onFile(file);
  };

  const open = () => {
    if (!disabled) inputRef.current?.click();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open();
    }
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) setDragging(true);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) pick(event.dataTransfer.files);
  };

  return (
    <div
      className={`terminal dropzone${dragging ? ' dropzone--active' : ''}${disabled ? ' dropzone--disabled' : ''}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Wgraj plik PDF: przeciągnij plik lub naciśnij Enter, aby wybrać z dysku"
      aria-describedby={hintId}
      aria-disabled={disabled}
      onClick={open}
      onKeyDown={onKeyDown}
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div className="terminal__bar" aria-hidden="true">
        <span className="terminal__dots">
          <i />
          <i />
          <i />
        </span>
        <span>root@pdf-insight:~</span>
      </div>
      <div className="terminal__body">
        <p className="mono" aria-hidden="true">
          <span className="accent">$</span> upload --type pdf --max{' '}
          {formatBytes(LIMITS.maxFileBytes)}
        </p>
        <p className="dropzone__title">{dragging ? 'Upuść plik' : 'Przeciągnij PDF tutaj'}</p>
        <span className="button button--primary dropzone__button" aria-hidden="true">
          Wybierz plik
        </span>
        <p id={hintId} className="dropzone__hint mono">
          Tylko PDF · maks. {formatBytes(LIMITS.maxFileBytes)}
          <span className="cursor" aria-hidden="true" />
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        tabIndex={-1}
        onChange={(event) => {
          pick(event.target.files);
          event.target.value = '';
        }}
      />
    </div>
  );
}
