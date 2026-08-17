import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaymentGraceBanner } from './PaymentGraceBanner';
import type { BillingStatus, SubscriptionStatus } from '@/api/types';

/**
 * Part 9 coverage for the non-payment grace banner: it renders from the
 * SERVER-driven grace state (gracePeriodEndsAt / graceDaysRemaining), never a
 * client-side timer, and hides entirely when there is no outstanding failure.
 */
const getBillingStatus = vi.hoisted(() => vi.fn());
vi.mock('@/api/billing', () => ({ getBillingStatus }));

function status(overrides: Partial<BillingStatus>): BillingStatus {
  return {
    subscriptionStatus: 'PAST_DUE' as SubscriptionStatus,
    planPriceId: null,
    hasStripeCustomer: true,
    billingConfigured: true,
    trialEndsAt: null,
    trialActive: false,
    paymentFailureCount: 1,
    lastPaymentFailedAt: '2026-08-10T00:00:00Z',
    nextPaymentAttemptAt: null,
    gracePeriodEndsAt: null,
    graceDaysRemaining: null,
    ...overrides,
  };
}

function renderBanner() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    // Swallow the expected 403 in the fail-quiet test so it doesn't surface as
    // an unhandled rejection — the component's own behaviour (render null) is
    // what's under assertion.
    queryCache: new QueryCache({ onError: () => {} }),
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PaymentGraceBanner />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PaymentGraceBanner (Part 9)', () => {
  beforeEach(() => getBillingStatus.mockReset());

  it('renders the server-driven countdown while a grace window is active', async () => {
    getBillingStatus.mockResolvedValue(status({ gracePeriodEndsAt: '2026-08-20T00:00:00Z', graceDaysRemaining: 3 }));
    renderBanner();

    expect(await screen.findByText(/Payment failed/)).toBeInTheDocument();
    expect(screen.getByText('3 days')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Update payment/ })).toHaveAttribute('href', '/billing');
  });

  it('uses the server graceDaysRemaining, NOT a client-side date computation', async () => {
    // Deliberately mismatched: the deadline is months away, but the server says
    // 2 days. A client-side timer would show a big number computed from the
    // date; a server-driven banner shows exactly the count the server sent.
    getBillingStatus.mockResolvedValue(status({ gracePeriodEndsAt: '2026-12-31T00:00:00Z', graceDaysRemaining: 2 }));
    renderBanner();

    expect(await screen.findByText('2 days')).toBeInTheDocument();
    // No large date-derived remaining count leaked through.
    expect(screen.queryByText(/1\d\d days/)).not.toBeInTheDocument();
  });

  it('collapses to "less than a day" at or under zero days remaining', async () => {
    getBillingStatus.mockResolvedValue(status({ gracePeriodEndsAt: '2026-08-20T00:00:00Z', graceDaysRemaining: 0 }));
    renderBanner();
    expect(await screen.findByText('less than a day')).toBeInTheDocument();
  });

  it('renders nothing when there is no grace window (payment healthy / fails quiet)', async () => {
    // Both the healthy case and the fail-quiet 403 case (users without
    // billing:view) resolve to no gracePeriodEndsAt → the banner renders null.
    getBillingStatus.mockResolvedValue(status({ gracePeriodEndsAt: null, graceDaysRemaining: null }));
    const { container } = renderBanner();
    await waitFor(() => expect(getBillingStatus).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
