export type MeterTone = 'success' | 'warning' | 'danger' | 'accent';

const FILL: Record<MeterTone, string> = {
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  accent: 'bg-accent-600',
};

const DOT: Record<MeterTone, string> = {
  success: 'text-success-500',
  warning: 'text-warning-500',
  danger: 'text-danger-500',
  accent: 'text-accent-600',
};

/**
 * A labelled horizontal progress bar with a right-aligned percentage chip and
 * an optional sub-line — the "Compliance position" row shape from the design.
 * Shared by the compliance-position and fleet-utilisation widgets.
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
        <span className="flex items-center gap-1 text-xs tabular-nums text-(--text-secondary)">
          <span className={DOT[tone]} aria-hidden>●</span>
          {clamped}%
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-(--surface-2)">
        <div className={`h-full rounded-full ${FILL[tone]}`} style={{ width: `${clamped}%` }} />
      </div>
      {sublabel && <p className="mt-1 text-xs text-(--text-tertiary)">{sublabel}</p>}
    </div>
  );
}
