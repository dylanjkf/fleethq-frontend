export type MeterTone = 'success' | 'warning' | 'danger' | 'accent';

const FILL: Record<MeterTone, string> = {
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  accent: 'bg-accent-600',
};

const DOT: Record<MeterTone, string> = {
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  accent: 'bg-accent-500',
};

/**
 * A labelled horizontal progress bar with a right-aligned percentage and an
 * optional sub-line — the "Compliance position" row shape from the design.
 * Shared by the compliance-position and fleet-utilisation widgets. The fill
 * eases in so a value change reads as motion, not a jump.
 */
export function MeterBar({
  label,
  percent,
  tone,
  sublabel,
}: {
  label: string;
  percent: number;
  tone: MeterTone;
  sublabel?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-(--text-primary)">{label}</span>
        <span className="flex items-center gap-1.5 text-xs font-medium tabular-nums text-(--text-secondary)">
          <span className={`h-1.5 w-1.5 rounded-full ${DOT[tone]}`} aria-hidden />
          {clamped}%
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-(--surface-inset) ring-1 ring-inset ring-(--border-subtle)">
        <div
          className={`h-full rounded-full ${FILL[tone]} transition-[width] duration-500 [transition-timing-function:var(--ease-out-soft)]`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {sublabel && <p className="mt-1.5 text-xs text-(--text-tertiary)">{sublabel}</p>}
    </div>
  );
}
