import { useSyncExternalStore } from 'react';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'destructive';
}

type ToastInput = Omit<ToastItem, 'id'>;

/**
 * Minimal imperative toast store — `toast()` can be called from anywhere
 * (mutation onSuccess/onError handlers, not just components), and
 * `useToast()` subscribes components (the Toaster) to the current list.
 * No backend notification source exists yet (see FleetOS Memory Vault's
 * Decision Log for this build) — this is the display mechanism, ready for
 * one later.
 */
let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();
const TOAST_DURATION_MS = 5000;

function emit() {
  listeners.forEach((l) => l());
}

export function toast(input: ToastInput): void {
  const id = crypto.randomUUID();
  toasts = [...toasts, { id, ...input }];
  emit();
  setTimeout(() => dismiss(id), TOAST_DURATION_MS);
}

export function dismiss(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToast() {
  const items = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => toasts,
  );
  return { toasts: items, dismiss, toast };
}
