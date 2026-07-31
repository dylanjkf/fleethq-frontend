const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

/**
 * Auth/Billing Platform Phase 7: the PAST_DUE banner used to be a single
 * static sentence regardless of how many times Stripe had tried, or when
 * (or whether) it would try again — `paymentFailureCount`/`nextPaymentAttemptAt`
 * (Phase 5) existed on the API response but nothing in the UI read them yet.
 * Kept out of BillingPage.tsx so that file stays components-only (fast-refresh).
 */
export function paymentFailureMessage(paymentFailureCount: number, nextPaymentAttemptAt: string | null): string {
  const attempts = paymentFailureCount > 1 ? ` Stripe has tried ${paymentFailureCount} times.` : '';
  if (nextPaymentAttemptAt) {
    const next = new Date(nextPaymentAttemptAt).toLocaleDateString('en-AU', DATE_FORMAT);
    return `Your last payment didn't go through.${attempts} Stripe will automatically retry on ${next} — update your payment method before then to avoid an interruption.`;
  }
  return `Your last payment didn't go through.${attempts} Stripe will not retry automatically — update your payment method now to keep your subscription active.`;
}
