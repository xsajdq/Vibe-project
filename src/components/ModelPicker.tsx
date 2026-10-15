import { useId } from 'react';

interface Props {
  models: string[];
  selected: string | null;
  onSelect: (model: string | null) => void;
  /** false = lista domyślna (API jeszcze nie odpowiedziało). */
  fromApi?: boolean;
  compact?: boolean;
}

/**
 * Wybór modelu Gemini. „Automatycznie” = model domyślny backendu, a przy jego
 * przeciążeniu kolejne z listy. Wybrany model jest próbowany jako pierwszy.
 */
export function ModelPicker({
  models,
  selected,
  onSelect,
  fromApi = true,
  compact = false,
}: Props) {
  const id = useId();
  if (models.length === 0) return null;

  return (
    <div className={`model-picker${compact ? ' model-picker--compact' : ''}`}>
      <label htmlFor={id} className="label">
        Model AI
      </label>
      <div className="select-wrap">
        <select
          id={id}
          className="select"
          value={selected ?? ''}
          onChange={(event) => onSelect(event.target.value || null)}
        >
          <option value="">Automatycznie ({models[0]})</option>
          {models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>
      {!compact && (
        <p className="hint">
          {fromApi
            ? 'Jeśli wybrany model jest przeciążony, aplikacja sama spróbuje kolejnego.'
            : 'Lista domyślna — nie udało się jeszcze połączyć z serwerem analizy.'}
        </p>
      )}
    </div>
  );
}
