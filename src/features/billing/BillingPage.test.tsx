import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as billingApi from '@/api/billing';
import { BillingPage } from './BillingPage';

/**
 * H9 follow-up — the customer-facing checkout/portal flow. The backend
 * checkout-session test already landed; this covers the UI half: the buttons
 * create the right Stripe session and redirect to it, and a failed session
 * surfaces an error toast rather than failing silently (the exact silent-failure
 * class several Medium findings flag elsewhere in this app).
 */
vi.mock('@/api/billing');
const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => ({ can: () => true }) }));

const originalLocation = window.location;

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BillingPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // A capturable stand-in for window.location so a redirect is observable and
  // jsdom doesn't attempt real navigation.
  Object.defineProperty(window, 'location', { configurable: true, value: { href: '', origin: 'http://localhost' } });

  vi.mocked(billingApi.getBillingStatus).mockResolvedValue({
    billingConfigured: true,
    subscriptionStatus: 'NONE',
    hasStripeCustomer: true,
    planPriceId: null,
    paymentFailureCount: 0,
    nextPaymentAttemptAt: null,
  } as never);
  vi.mocked(billingApi.getEntitlements).mockResolvedValue({
    trialActive: false,
    usage: { assets: 1, operators: 1 },
    limits: { maxAssets: 10, maxOperators: 10 },
  } as never);
  vi.mocked(billingApi.getPlans).mockResolvedValue({
    billingConfigured: true,
    plans: [
      { key: 'pro', name: 'Pro', priceId: 'price_123', purchasable: true, features: ['x'], limits: { maxAssets: 10, maxOperators: 10 } },
    ],
  } as never);
  vi.mocked(billingApi.createCheckoutSession).mockResolvedValue({ url: 'https://checkout.example/session' });
  vi.mocked(billingApi.createPortalSession).mockResolvedValue({ url: 'https://portal.example/session' });
});

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
});

describe('BillingPage — checkout & portal', () => {
  it('starts a checkout session for the chosen plan and redirects to Stripe', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Choose Pro' }));

    await waitFor(() => expect(billingApi.createCheckoutSession).toHaveBeenCalledWith('price_123'));
    await waitFor(() => expect(window.location.href).toBe('https://checkout.example/session'));
  });

  it('opens the Stripe billing portal and redirects to it', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Manage billing/ }));

    await waitFor(() => expect(billingApi.createPortalSession).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(window.location.href).toBe('https://portal.example/session'));
  });

  it('surfaces an error toast (and does not redirect) when checkout session creation fails', async () => {
    vi.mocked(billingApi.createCheckoutSession).mockRejectedValueOnce(new Error('stripe down'));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Choose Pro' }));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Could not start checkout', variant: 'destructive' })),
    );
    // No silent navigation to a broken URL.
    expect(window.location.href).toBe('');
  });
});
