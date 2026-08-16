import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { getBillingStatus } from '@/api/billing';

/**
 * App-wide non-payment countdown banner (Part 3). Shown from the moment a
 * payment fails and, unlike the existing warning email, it counts down the real
 * number of days remaining before the account is restricted to read-only.
 *
 * The countdown is driven entirely by the server-side deadline
 * (`gracePeriodEndsAt` / `graceDaysRemaining` on GET /v1/billing/status), NOT a
 * client-side timer — so refreshing the page can't reset it, and it advances as
 * days pass. It disappears the instant payment succeeds (the server clears the
 * deadline, the query refetches, and this renders null).
 *
 * Fails quiet: users without `billing:view` get a 403 here (retry:false), so the
 * banner simply doesn't render for them — they can't act on billing anyway.
 */
export function PaymentGraceBanner() {
  const { data } = useQuery({
    queryKey: ['billing', 'status'],
    queryFn: getBillingStatus,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  if (!data?.gracePeriodEndsAt) return null;

  const days = data.graceDaysRemaining ?? 0;
  const deadline = new Date(data.gracePeriodEndsAt).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const remaining = days <= 0 ? 'less than a day' : days === 1 ? '1 day' : `${days} days`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 sm:px-6"
    >
      <span>
        <strong className="font-semibold">Payment failed.</strong> Your account stays fully active for{' '}
        <strong className="font-semibold">{remaining}</strong> — until {deadline} — before it becomes read-only. Update your
        payment method to keep full access.
      </span>
      <Link
        to="/billing"
        className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 font-medium text-white transition-colors hover:bg-amber-700"
      >
        Update payment
      </Link>
    </div>
  );
}
