import { useSyncExternalStore } from 'react';

/**
 * Minimal, dependency-free toast store for the admin console.
 *
 * Deliberately an external store rather than a pure React context: the global
 * `MutationCache.onError` in App.tsx fires *outside* the React tree, so it
 * needs a way to surface a failure that doesn't depend on being inside a
 * provider. Components still get an idiomatic `useToast()` hook, and
 * `<ToastProvider>` renders the actual toast region — both read this same
 * store via `useSyncExternalStore`, so there is one source of truth.
 */
export type ToastType = 'error' | 'success' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

const DEFAULT_TTL_MS = 6000;

let toasts: Toast[] = [];
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Push a toast onto the queue. Safe to call from anywhere (React or not). Returns the toast id. */
export function pushToast(type: ToastType, message: string, ttlMs: number = DEFAULT_TTL_MS): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  toasts = [...toasts, { id, type, message }];
  emit();
  if (ttlMs > 0) {
    timers.set(
      id,
      setTimeout(() => dismissToast(id), ttlMs),
    );
  }
  return id;
}

export function dismissToast(id: string): void {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  if (!toasts.some((t) => t.id === id)) return;
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts(): Toast[] {
  return toasts;
}

/** Read the live toast list (used by the rendered region). */
export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribeToasts, getToasts, getToasts);
}

/** Idiomatic helper for components that want to raise their own notifications. */
export function useToast(): {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  dismiss: (id: string) => void;
} {
  return {
    toast: (message, type = 'info') => pushToast(type, message),
    success: (message) => pushToast('success', message),
    error: (message) => pushToast('error', message),
    dismiss: dismissToast,
  };
}
