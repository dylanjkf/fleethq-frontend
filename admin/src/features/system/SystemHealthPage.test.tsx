import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as systemApi from '@/api/system';
import type { SystemHealth } from '@/api/types';
import { SystemHealthPage } from './SystemHealthPage';

/**
 * System & ops health (B4). Proves the new scheduler + observability panels
 * render REAL data and, crucially, surface the honest "not available" note for
 * the feeds this deployment can't summarise — instead of a fabricated metric.
 */
vi.mock('@/api/system');

const HEALTH: SystemHealth = {
  database: { customerApiConnected: true, adminPlatformConnected: true },
  process: { uptimeSeconds: 3661, nodeVersion: 'v22.0.0', nodeEnv: 'production' },
  version: { apiVersion: '0.1.0', deployedCommit: 'abc123' },
  scheduler: {
    enabled: true,
    granularity: 'last_claimed',
    tasks: [{ task: 'trial-expiry-sweep', holder: 'pod-7', lastClaimedAt: new Date('2026-08-16T10:00:00Z').toISOString(), leaseHeldUntil: new Date('2026-08-16T10:05:00Z').toISOString() }],
  },
  observability: {
    errorTracking: { provider: 'sentry', configured: false, summaryAvailable: false, note: 'Errors report to Sentry; no in-app 5xx aggregate here.' },
    emailDelivery: { provider: 'ses', failureLogAvailable: false, note: 'SES send failures are not persisted.' },
  },
  checkedAt: new Date('2026-08-17T00:00:00Z').toISOString(),
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <SystemHealthPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(systemApi.getSystemHealth).mockResolvedValue(HEALTH);
});

describe('SystemHealthPage — scheduler + observability (B4)', () => {
  it('renders the real scheduler lease row', async () => {
    renderPage();
    expect(await screen.findByText('trial-expiry-sweep')).toBeInTheDocument();
    expect(screen.getByText('pod-7')).toBeInTheDocument();
    expect(screen.getByText(/granularity: last_claimed/)).toBeInTheDocument();
  });

  it('surfaces the honest "no aggregate" notes rather than a fabricated metric', async () => {
    renderPage();
    expect(await screen.findByText(/no in-app 5xx aggregate here/i)).toBeInTheDocument();
    expect(screen.getByText(/SES send failures are not persisted/i)).toBeInTheDocument();
    // The two feeds are honestly flagged as not-available.
    expect(screen.getByText('Not configured')).toBeInTheDocument();
    expect(screen.getByText('No failure feed')).toBeInTheDocument();
  });
});
