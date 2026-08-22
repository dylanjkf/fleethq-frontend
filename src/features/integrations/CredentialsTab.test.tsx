import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as integrationsApi from '@/api/integrations';
import type { IntegrationCredential } from '@/api/integrations';
import { CredentialsTab } from './CredentialsTab';

/**
 * Audit Part 6 (item E): the "Test" action makes a live authenticated call with
 * the stored secret, so it must be gated behind canManage like Edit/Archive — a
 * view-only user should not be able to exercise a credential. This asserts the
 * button is present for a manager and absent for a viewer.
 */
vi.mock('@/api/integrations');
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const credential: IntegrationCredential = {
  id: 'cred-1',
  companyId: 'co-1',
  name: 'Acme API key',
  authType: 'API_KEY',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  rotatedAt: null,
  archivedAt: null,
};

function renderTab(canManage: boolean) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CredentialsTab canManage={canManage} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(integrationsApi.listCredentials).mockResolvedValue({ items: [credential], total: 1, page: 1, pageSize: 25 } as never);
});

describe('CredentialsTab — Test button permission gating', () => {
  it('shows the Test button to a manager', async () => {
    renderTab(true);
    expect(await screen.findByRole('button', { name: 'Test' })).toBeInTheDocument();
  });

  it('hides the Test button from a view-only user', async () => {
    renderTab(false);
    // Wait for the row to render, then assert Test is absent.
    expect(await screen.findByText('Acme API key')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Test' })).not.toBeInTheDocument();
  });
});
