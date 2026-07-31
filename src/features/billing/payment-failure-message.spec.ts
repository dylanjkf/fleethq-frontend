import { describe, expect, it } from 'vitest';
import { paymentFailureMessage } from './payment-failure-message';

/**
 * Auth/Billing Platform Phase 7: the PAST_DUE banner used to be one static
 * sentence regardless of retry state — these pin the three real states the
 * backend's paymentFailureCount/nextPaymentAttemptAt (Phase 5) can put a
 * company in.
 */
describe('paymentFailureMessage', () => {
  it('mentions the next retry date when Stripe will try again', () => {
    const message = paymentFailureMessage(1, '2026-08-03T00:00:00.000Z');
    expect(message).toContain('automatically retry on');
    expect(message).not.toContain('tried'); // no attempt count for a single failure
  });

  it('reports the attempt count once there has been more than one failure', () => {
    const message = paymentFailureMessage(3, '2026-08-03T00:00:00.000Z');
    expect(message).toContain('Stripe has tried 3 times');
  });

  it('says retries are exhausted when there is no next attempt', () => {
    const message = paymentFailureMessage(5, null);
    expect(message).toContain('will not retry automatically');
    expect(message).toContain('Stripe has tried 5 times');
  });
});
