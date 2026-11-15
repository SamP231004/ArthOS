"use client";

// Inputs and result cards shared by the free calculators. Everything is computed in the browser; nothing is sent.

export const inr = (n: number) => "₹" + Math.round(Number.isFinite(n) ? n : 0).toLocaleString("en-IN");

/** ₹ in Indian words for big numbers: 1,25,00,000 → "1.25 crore", 4,50,000 → "4.5 lakh". */
export function inrWords(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e7) return `₹${trim(n / 1e7)} crore`;
  if (a >= 1e5) return `₹${trim(n / 1e5)} lakh`;
  return inr(n);
}
const trim = (v: number) => (Math.round(v * 100) / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  prefix,
  suffix,
  hint,
  slider = true,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  hint?: string;
  slider?: boolean;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm text-fg-2">{label}</label>
        <div className="flex w-40 items-center rounded-xl border border-line-strong bg-[var(--field)] px-3 focus-within:border-[rgb(var(--glow)/0.6)]">
          {prefix && <span className="text-sm text-subtle">{prefix}</span>}
          <input
            id={id}
            type="number"
            inputMode="decimal"
            className="tabular w-full bg-transparent py-2 pl-1 text-right text-sm text-fg outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            value={Number.isFinite(value) ? value : ""}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(e.target.value === "" ? 0 : Math.max(min, Number(e.target.value)))}
          />
          {suffix && <span className="pl-1 text-sm text-subtle">{suffix}</span>}
        </div>
      </div>
      {slider && (
        <input
          type="range"
          aria-label={label}
          className="mt-3 w-full accent-[var(--mark)]"
          min={min}
          max={max}
          step={step}
          value={Math.min(max, value)}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      )}
      {hint && <p className="mt-1.5 text-xs text-subtle">{hint}</p>}
    </div>
  );
}

export function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div>
      <p className="text-sm text-fg-2">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {options.map(([v, l]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={`rounded-lg border px-3 py-1.5 text-xs transition ${value === v ? "border-fg/40 bg-fg/10 text-fg" : "border-line text-muted hover:text-fg"}`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Stat({ label, value, sub, tone = "fg", big = false }: { label: string; value: string; sub?: string; tone?: "fg" | "income" | "expense" | "mark"; big?: boolean }) {
  const color = { fg: "text-fg", income: "text-income", expense: "text-expense", mark: "text-mark" }[tone];
  return (
    <div className={big ? "panel-glow p-5" : "panel p-5"}>
      <p className="text-xs text-subtle">{label}</p>
      <p className={`tabular mt-2 font-semibold tracking-tight ${big ? "text-4xl" : "text-2xl"} ${color}`}>{value}</p>
      {sub && <p className="mt-1.5 text-xs leading-relaxed text-muted">{sub}</p>}
    </div>
  );
}

/** Calculator layout: inputs on the left, results on the right; stacks on phones. */
export function ToolFrame({ inputs, results }: { inputs: React.ReactNode; results: React.ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
      <div className="panel space-y-6 p-5 sm:p-6">{inputs}</div>
      <div className="space-y-4">{results}</div>
    </div>
  );
}

/** Horizontal stacked bar with a legend. */
export function SplitBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + Math.max(0, p.value), 0) || 1;
  return (
    <div className="panel p-5">
      <div className="flex h-3 overflow-hidden rounded-full bg-fg/5">
        {parts.map((p) => (
          <div key={p.label} style={{ width: `${(Math.max(0, p.value) / total) * 100}%`, background: p.color }} className="transition-all" />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted">
        {parts.map((p) => (
          <span key={p.label} className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: p.color }} />
            {p.label} · {Math.round((Math.max(0, p.value) / total) * 100)}%
          </span>
        ))}
      </div>
    </div>
  );
}
