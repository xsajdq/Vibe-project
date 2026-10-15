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
      className={`dropzone${dragging ? ' dropzone--active' : ''}${disabled ? ' dropzone--disabled' : ''}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-describedby={hintId}
      onClick={open}
      onKeyDown={onKeyDown}
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <svg className="dropzone__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 18v-6M9 15l3-3 3 3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="dropzone__title">
        {dragging ? 'Upuść plik tutaj' : 'Przeciągnij plik PDF tutaj'}
      </p>
      <p className="dropzone__subtitle">
        lub <span className="link-like">wybierz z dysku</span>
      </p>
      <p id={hintId} className="dropzone__hint">
        Tylko PDF, maks. {formatBytes(LIMITS.maxFileBytes)}
      </p>
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
