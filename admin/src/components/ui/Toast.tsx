import type { ReactNode } from 'react';
import { dismissToast, useToasts, type ToastType } from '@/hooks/useToast';

const TONE_CLASSES: Record<ToastType, string> = {
  error: 'border-danger-500/40',
  success: 'border-success-500/40',
  info: 'border-(--border-subtle)',
};

const DOT_CLASSES: Record<ToastType, string> = {
  error: 'bg-danger-500',
  success: 'bg-success-500',
  info: 'bg-accent-500',
};

/**
 * Renders every child plus the fixed toast region. Mount once, near the root,
 * so notifications raised from anywhere (including the global MutationCache
 * onError, which lives outside the React tree) always have somewhere to land.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const toasts = useToasts();
  return (
    <>
      {children}
      <div
        className="pointer-events-none fixed bottom-0 right-0 z-[60] flex w-full max-w-sm flex-col gap-2 p-4"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-3 rounded-(--radius-panel) border bg-(--surface-2) px-4 py-3 shadow-(--elevation-1) ${TONE_CLASSES[toast.type]}`}
          >
            <span className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT_CLASSES[toast.type]}`} aria-hidden="true" />
            <span className="flex-1 text-sm text-(--text-primary)">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 text-(--text-tertiary) transition-colors hover:text-(--text-primary)"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
