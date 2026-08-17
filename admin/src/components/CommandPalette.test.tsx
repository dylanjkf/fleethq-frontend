import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as searchApi from '@/api/search';
import { AuthWrapper, makeAuth, makeAdmin } from '@/test/auth';
import { CommandPalette } from './CommandPalette';

/**
 * Cross-tenant search (B1) in the palette. Proves the two additions render: a
 * user hit now shows which company it belongs to, and job/load hits appear as
 * their own section — each company-scoped so an operator can jump to the tenant.
 */
vi.mock('@/api/search');

function renderPalette() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const auth = makeAuth({ admin: makeAdmin({ permissions: ['organisations:view'] }) });
  render(
    <QueryClientProvider client={qc}>
      <AuthWrapper value={auth}>
        <MemoryRouter>
          <CommandPalette open onClose={vi.fn()} />
        </MemoryRouter>
      </AuthWrapper>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(searchApi.globalSearch).mockResolvedValue({
    companies: [],
    users: [{ id: 'u1', fullName: 'Dana Driver', email: 'dana@example.test', companies: [{ id: 'co-1', name: 'Zephyr Freight' }] }],
    assets: [],
    jobs: [{ id: 'j1', title: 'Load-9000', company: { id: 'co-1', name: 'Zephyr Freight' } }],
  });
});

describe('CommandPalette — cross-tenant search (B1)', () => {
  it('shows a user with their owning company and a jobs section', async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.type(screen.getByRole('textbox'), 'zephyr');

    // User hit carries the company, and the job hit is company-scoped too — so
    // the tenant name appears in both the user row and the jobs row.
    expect(await screen.findByText('Dana Driver')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText(/Zephyr Freight/).length).toBeGreaterThanOrEqual(2));

    // Jobs section + a company-scoped job hit.
    expect(screen.getByText('Jobs')).toBeInTheDocument();
    expect(screen.getByText('Load-9000')).toBeInTheDocument();
  });
});
