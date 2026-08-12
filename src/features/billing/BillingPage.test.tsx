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
const { toastMock, canMock } = vi.hoisted(() => ({ toastMock: vi.fn(), canMock: vi.fn(() => true) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));
// `can` is a hoisted mock so individual tests can flip billing:manage on/off.
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => ({ can: canMock }) }));

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
  canMock.mockReturnValue(true);
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

/**
 * M14 — permission-gated UI is actually hidden/disabled, not merely relying on
 * the backend to reject the write. A user without `billing:manage` must not be
 * able to trigger a plan change or open the Stripe portal from this screen.
 */
describe('BillingPage — permission gating (M14)', () => {
  it('hides the portal action, disables plan changes, and explains the restriction when the user lacks billing:manage', async () => {
    canMock.mockReturnValue(false);
    renderPage();

    // The read-only explanation renders...
    expect(
      await screen.findByText(/don't have permission to change billing/i),
    ).toBeInTheDocument();
    // ...the "Manage billing" portal button is not rendered at all...
    expect(screen.queryByRole('button', { name: /Manage billing/ })).not.toBeInTheDocument();
    // ...and the plan CTA is present but disabled, so the click can't fire.
    expect(await screen.findByRole('button', { name: 'Choose Pro' })).toBeDisabled();
  });

  it('does not create a checkout session when a disabled plan CTA is clicked without billing:manage', async () => {
    canMock.mockReturnValue(false);
    const user = userEvent.setup();
    renderPage();

    const cta = await screen.findByRole('button', { name: 'Choose Pro' });
    await user.click(cta).catch(() => {}); // userEvent refuses to click a disabled control
    expect(billingApi.createCheckoutSession).not.toHaveBeenCalled();
  });
});
