import { useEffect, useState } from "react";
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(String(+value.toFixed(4)));
  useEffect(() => setDraft(String(+value.toFixed(4))), [value]);
  const commit = () => {
    const n = Number(draft);
    // A parent may reject a cross-field constraint, such as crop bounds.
    // Restore the committed value unless the parent accepts a new one.
    setDraft(String(+value.toFixed(4)));
    if (
      draft.trim() &&
      Number.isFinite(n) &&
      (min === undefined || n >= min) &&
      (max === undefined || n <= max)
    ) {
      if (n !== value) onChange(n);
    } else setDraft(String(+value.toFixed(4)));
  };
  return (
    <label className="field">
      <span>{label}</span>
      <div className="input-unit">
        <input
          aria-label={label}
          type="number"
          value={draft}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        {suffix && <small>{suffix}</small>}
      </div>
    </label>
  );
}
export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function AspectLock({
  label,
  locked,
  onChange,
}: {
  label: string;
  locked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={`aspect-lock ${locked ? "locked" : ""}`}
      aria-label={label}
      aria-pressed={locked}
      title={locked ? "Unlock width and height" : "Link width and height"}
      onClick={() => onChange(!locked)}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        {locked ? (
          <>
            <path d="m10 13 4-4" />
            <path
              d="m8 15-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 3 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"
              transform="translate(1 0)"
            />
          </>
        ) : (
          <>
            <path d="m7 14-2 2a3 3 0 0 0 4 4l3-3m5-7 2-2a3 3 0 0 0-4-4l-3 3M3 3l18 18" />
          </>
        )}
      </svg>
      {locked ? "Aspect ratio locked" : "Aspect ratio unlocked"}
    </button>
  );
}
