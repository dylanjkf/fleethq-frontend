import { describe, expect, it } from 'vitest';
import { dismissToast, getToasts, pushToast, subscribeToasts } from './useToast';

describe('toast store', () => {
  it('pushes a toast, notifies subscribers, and auto-dismisses after its ttl', async () => {
    let notifications = 0;
    const unsubscribe = subscribeToasts(() => {
      notifications += 1;
    });

    const before = getToasts().length;
    const id = pushToast('error', 'Something failed', 20);

    expect(getToasts().length).toBe(before + 1);
    expect(getToasts().some((t) => t.id === id && t.type === 'error')).toBe(true);
    expect(notifications).toBeGreaterThan(0);

    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(getToasts().some((t) => t.id === id)).toBe(false);

    unsubscribe();
  });

  it('dismisses a toast on demand', () => {
    const id = pushToast('success', 'Done', 0);
    expect(getToasts().some((t) => t.id === id)).toBe(true);
    dismissToast(id);
    expect(getToasts().some((t) => t.id === id)).toBe(false);
  });
});
