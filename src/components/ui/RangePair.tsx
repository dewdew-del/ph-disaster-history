"use client";

type Props = {
  label: string;
  min: number;
  max: number;
  step: number;
  from: number;
  to: number;
  onChange: (from: number, to: number) => void;
  format?: (n: number) => string;
};

/** Two sliders (from / to) that can't cross each other. */
export default function RangePair({ label, min, max, step, from, to, onChange, format = String }: Props) {
  const id = label.toLowerCase().replace(/\W+/g, "-");
  const snap = (n: number) => Math.round(n / step) * step;
  return (
    <fieldset className="space-y-1.5">
      <legend className="flex w-full justify-between text-sm font-medium">
        <span>{label}</span>
        <span className="tabular-nums text-muted">
          {format(from)} – {format(to)}
        </span>
      </legend>
      <label className="flex items-center gap-2 text-xs text-muted" htmlFor={`${id}-from`}>
        <span className="w-8">From</span>
        <input
          id={`${id}-from`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={from}
          onChange={(e) => {
            const v = snap(Number(e.target.value));
            onChange(Math.min(v, to), to);
          }}
          className="w-full accent-[var(--accent)]"
        />
      </label>
      <label className="flex items-center gap-2 text-xs text-muted" htmlFor={`${id}-to`}>
        <span className="w-8">To</span>
        <input
          id={`${id}-to`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={to}
          onChange={(e) => {
            const v = snap(Number(e.target.value));
            onChange(from, Math.max(v, from));
          }}
          className="w-full accent-[var(--accent)]"
        />
      </label>
    </fieldset>
  );
}
