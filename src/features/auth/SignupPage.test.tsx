import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as signupApi from '@/api/signup';
import { ApiClientError } from '@/api/client';
import { SignupPage } from './SignupPage';

/**
 * Coverage for the self-serve signup page (audit Part 5): the price display and
 * the Stripe checkout hand-off. This is the top of the paid funnel — the figure
 * a prospect sees and the redirect that takes their money — and it had no test,
 * so a regression (a GST miscalculation shown, the redirect dropped, a failed
 * session failing silently) would ship unnoticed. useAuth is stubbed to
 * unauthenticated (an authed user is redirected away from signup), and
 * window.location is replaced with a capturable stub so the redirect is
 * observable and jsdom never attempts real navigation.
 */
vi.mock('@/api/signup');
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ status: 'unauthenticated' }) }));

const originalLocation = window.location;

function renderPage() {
  return render(
    <MemoryRouter>
      <SignupPage />
    </MemoryRouter>,
  );
}

async function fillValidForm(u: ReturnType<typeof userEvent.setup>) {
  await u.type(screen.getByLabelText('Company name'), 'Acme Freight');
  await u.type(screen.getByLabelText('Your name'), 'Dana Owner');
  await u.type(screen.getByLabelText('Work email'), 'owner@acme.example');
  await u.type(screen.getByLabelText('Password'), 'Passw0rd!');
  await u.click(screen.getByRole('checkbox'));
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'location', { configurable: true, value: { href: '', origin: 'http://localhost' } });
  vi.mocked(signupApi.getSignupConfig).mockResolvedValue({
    enabled: true,
    priceCents: 2900,
    currency: 'AUD',
    billingInterval: 'month',
    gstRate: 0.1,
  });
  vi.mocked(signupApi.createSignup).mockResolvedValue({ url: 'https://checkout.stripe.example/session-abc' });
});

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
});

describe('SignupPage — price display', () => {
  it('shows the flat price, computed GST, and the GST-inclusive total from the server config', async () => {
    renderPage();
    // Subtotal $29.00, GST 10% = $2.90, total $31.90 — the figures the prospect commits to.
    expect(await screen.findByText('$29.00')).toBeInTheDocument();
    expect(screen.getByText('GST (10%)')).toBeInTheDocument();
    expect(screen.getByText('$2.90')).toBeInTheDocument();
    expect(screen.getByText('$31.90')).toBeInTheDocument();
  });

  it('tells the visitor when self-serve signup is disabled instead of showing the form', async () => {
    vi.mocked(signupApi.getSignupConfig).mockResolvedValue({
      enabled: false,
      priceCents: 2900,
      currency: 'AUD',
      billingInterval: 'month',
      gstRate: 0.1,
    });
    renderPage();
    expect(await screen.findByText(/Self-serve signup isn’t available right now/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continue to payment/ })).not.toBeInTheDocument();
  });
});

describe('SignupPage — Stripe checkout hand-off', () => {
  it('creates a signup and redirects the browser to the returned Stripe Checkout URL', async () => {
    const u = userEvent.setup();
    renderPage();
    await screen.findByLabelText('Company name');
    await fillValidForm(u);

    await u.click(screen.getByRole('button', { name: 'Continue to payment' }));

    await waitFor(() =>
      expect(signupApi.createSignup).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: 'Acme Freight',
          adminName: 'Dana Owner',
          adminEmail: 'owner@acme.example',
          adminPassword: 'Passw0rd!',
          acceptedTerms: true,
        }),
      ),
    );
    await waitFor(() => expect(window.location.href).toBe('https://checkout.stripe.example/session-abc'));
  });

  it('shows the error and does not redirect when starting the signup fails', async () => {
    vi.mocked(signupApi.createSignup).mockRejectedValueOnce(new ApiClientError(400, 'SIGNUP_FAILED', 'That email is already registered.'));
    const u = userEvent.setup();
    renderPage();
    await screen.findByLabelText('Company name');
    await fillValidForm(u);

    await u.click(screen.getByRole('button', { name: 'Continue to payment' }));

    expect(await screen.findByText('That email is already registered.')).toBeInTheDocument();
    expect(window.location.href).toBe(''); // no navigation happened
  });
});
