import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '@/app/providers/AuthProvider';
import type { CurrentUser } from '@/api/types';
import { PERMISSIONS } from '@/lib/permissions';
import * as customersApi from '@/api/customers';
import { CustomersPage } from './CustomersPage';

/**
 * Audit Part 6 (item F): a user who reaches /customers without customers:view
 * (direct URL, stale nav) must get the same clean "No access" EmptyState as
 * FuelPage/AuditLogPage — not a raw 403 ErrorState — and the list must never be
 * fetched. Previously the page fired the query unconditionally and fell through
 * to a red "Something went wrong" panel on the 403.
 */
vi.mock('@/api/customers');
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const testUser: CurrentUser = {
  userId: 'u1',
  username: 'test',
  fullName: 'Test User',
  company: { id: 'c1', name: 'Test Co', jurisdiction: 'AU' },
  membershipId: 'm1',
  role: { id: 'r1', name: 'Test Role' },
  permissions: [],
  mfaEnabled: false,
  mfaRequiredByCompany: false,
  operator: null,
};

function renderWithPermissions(granted: string[]) {
  const value = {
    status: 'authenticated',
    user: testUser,
    can: (p: string) => granted.includes(p),
    login: async () => { throw new Error('n/a'); },
    selectCompany: async () => { throw new Error('n/a'); },
    verifyMfa: async () => { throw new Error('n/a'); },
    loginWithMagicLink: async () => { throw new Error('n/a'); },
    loginWithOAuth: async () => { throw new Error('n/a'); },
    loginWithPasskey: async () => { throw new Error('n/a'); },
    confirmPolicyMfaSetup: async () => { throw new Error('n/a'); },
    changeExpiredPassword: async () => { throw new Error('n/a'); },
    loginWithToken: async () => {},
    logout: () => {},
  } as unknown as AuthContextValue;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={value}>
        <MemoryRouter>
          <CustomersPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(customersApi.listCustomers).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 } as never);
});

describe('CustomersPage — no-permission direct-URL behavior', () => {
  it('shows a "No access" EmptyState and never fetches the list without customers:view', async () => {
    renderWithPermissions([]); // no customers:view
    expect(await screen.findByText('No access')).toBeInTheDocument();
    // The list query is gated (enabled:false), so the API is never hit.
    expect(customersApi.listCustomers).not.toHaveBeenCalled();
  });

  it('loads the directory when the user has customers:view', async () => {
    renderWithPermissions([PERMISSIONS.CUSTOMERS_VIEW]);
    await waitFor(() => expect(customersApi.listCustomers).toHaveBeenCalled());
    expect(screen.queryByText('No access')).not.toBeInTheDocument();
  });
});
