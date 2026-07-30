import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as billing from '@/api/billing';
import { TrialBanner } from './TrialBanner';

vi.mock('@/api/billing', () => ({ getEntitlements: vi.fn() }));

function renderBanner() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TrialBanner />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const base = { planKey: 'trial', planName: 'Free trial', enforced: false, features: [], limits: { maxOperators: 25, maxAssets: 25 } };

describe('TrialBanner', () => {
  beforeEach(() => vi.clearAllMocks());

  it('nudges to plans with the days remaining while a trial is active', async () => {
    vi.mocked(billing.getEntitlements).mockResolvedValue({ ...base, trialActive: true, trialEndsAt: new Date().toISOString(), trialDaysLeft: 9 });
    renderBanner();
    expect(await screen.findByText(/9 days left/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view plans/i })).toHaveAttribute('href', '/billing');
  });

  it('says "1 day" (singular) at the end of the trial', async () => {
    vi.mocked(billing.getEntitlements).mockResolvedValue({ ...base, trialActive: true, trialEndsAt: new Date().toISOString(), trialDaysLeft: 1 });
    renderBanner();
    expect(await screen.findByText(/1 day left/i)).toBeInTheDocument();
  });

  it('renders nothing once the trial is over (or a subscription is active)', async () => {
    vi.mocked(billing.getEntitlements).mockResolvedValue({ ...base, planKey: 'free', trialActive: false, trialEndsAt: null, trialDaysLeft: null });
    const { container } = renderBanner();
    // Give the query a tick to resolve; the banner must stay empty.
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector('a')).toBeNull();
  });
});
