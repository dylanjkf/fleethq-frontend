import type { ReactNode } from 'react';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

/**
 * The operational-status tones use SOLID fills with a contrasting black/white
 * foreground so they meet WCAG AA (>=4.5:1) — the same fix already shipped in
 * the office app's Badge. The previous tinted pattern (`bg-<tone>-500/15
 * text-<tone>-500`) measured ~3.0-3.8:1 against the admin app's dark surfaces
 * and failed AA, which mattered most exactly where these render: the
 * "Failed"/"Open" status in the ops console's inspection and defect views
 * (Round 3 High). The colour tokens are fixed (not theme-scaled), so the
 * black/white foreground stays correct in both light and dark.
 */
const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-(--surface-2) text-(--text-secondary)',
  success: 'bg-success-500 text-black',
  warning: 'bg-warning-500 text-black',
  danger: 'bg-danger-500 text-white',
  accent: 'bg-accent-500 text-white',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}>{children}</span>;
}
