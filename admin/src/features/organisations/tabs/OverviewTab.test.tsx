import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as orgApi from '@/api/organisations';
import { OverviewTab } from './OverviewTab';

/**
 * C1 follow-up — impersonation mints a live customer session token attributed to
 * the impersonated user, one of the most sensitive actions in the console.
 * These prove it is gated behind the confirmation dialog: clicking "Impersonate"
 * does NOT start a session; only confirming does.
 */
vi.mock('@/api/organisations');
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

const org = {
  id: 'org-1',
  name: 'Acme Freight',
  archivedAt: null,
  suspendedAt: null,
  trialEndsAt: null,
  users: [
    {
      membershipId: 'm1',
      userId: 'user-9',
      fullName: 'Jo Driver',
      username: 'jo',
      role: { name: 'Driver' },
      accountDisabled: false,
      locked: false,
    },
  ],
} as never;

function renderTab() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <OverviewTab org={org} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(orgApi.impersonateUser).mockResolvedValue({ accessToken: 'tok', expiresIn: '900' } as never);
});

describe('OverviewTab — impersonation requires confirmation', () => {
  it('does not start an impersonation session until a reason is given and the dialog is confirmed', async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getByRole('button', { name: 'Impersonate' }));

    // Dialog is up; no session minted from the click alone.
    expect(orgApi.impersonateUser).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/mints a live customer session token/i)).toBeInTheDocument();

    // The confirm button is disabled until a reason is recorded (requireReason) —
    // impersonation is never minted without an accountable justification.
    const confirmButton = within(dialog).getByRole('button', { name: 'Impersonate' });
    expect(confirmButton).toBeDisabled();
    await user.click(confirmButton);
    expect(orgApi.impersonateUser).not.toHaveBeenCalled();

    await user.type(within(dialog).getByPlaceholderText('Reason…'), 'debugging a stuck delivery');
    await user.click(within(dialog).getByRole('button', { name: 'Impersonate' }));
    await waitFor(() => expect(orgApi.impersonateUser).toHaveBeenCalledWith('org-1', 'user-9'));
  });

  it('cancelling the impersonation dialog mints no session', async () => {
    const user = userEvent.setup();
    renderTab();
    await user.click(screen.getByRole('button', { name: 'Impersonate' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(orgApi.impersonateUser).not.toHaveBeenCalled();
  });
});
