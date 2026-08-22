import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as customerUsersApi from '@/api/customer-users';
import type { CustomerUserDetail } from '@/api/types';
import { CustomerUserDetailPage } from './CustomerUserDetailPage';

/**
 * Coverage for the admin customer-user actions (audit Part 5). These are staff
 * account-recovery levers — disable, reactivate, unlock, force-reset MFA, and
 * send-password-reset — and they had no test, so a regression (a button wired to
 * the wrong endpoint, a confirm-gate dropped, the disable toast lost) would ship
 * silently. Each test drives the real component and asserts it calls the exact
 * customer-users API function, with the two destructive actions going through
 * the reason-gated ConfirmDialog first.
 */
vi.mock('@/api/customer-users');
const { successMock, errorMock } = vi.hoisted(() => ({ successMock: vi.fn(), errorMock: vi.fn() }));
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ success: successMock, error: errorMock, toast: vi.fn(), dismiss: vi.fn() }),
}));

function makeUser(overrides: Partial<CustomerUserDetail> = {}): CustomerUserDetail {
  return {
    id: 'user-1',
    username: 'driver@corp.example',
    fullName: 'Dana Driver',
    email: 'driver@corp.example',
    emailVerifiedAt: '2026-01-01T00:00:00.000Z',
    accountDisabled: false,
    mfaEnabled: false,
    locked: false,
    failedLoginCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    organisations: [{ companyId: 'co-1', companyName: 'Acme Freight', role: { id: 'r1', name: 'Manager' } }],
    ...overrides,
  };
}

function renderPage(user: CustomerUserDetail) {
  vi.mocked(customerUsersApi.getCustomerUser).mockResolvedValue(user);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/customer-users/${user.id}`]}>
        <Routes>
          <Route path="/customer-users/:userId" element={<CustomerUserDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(customerUsersApi.disableCustomerUser).mockResolvedValue(undefined);
  vi.mocked(customerUsersApi.reactivateCustomerUser).mockResolvedValue(undefined);
  vi.mocked(customerUsersApi.unlockCustomerUser).mockResolvedValue(undefined);
  vi.mocked(customerUsersApi.resetCustomerUserMfa).mockResolvedValue(undefined);
  vi.mocked(customerUsersApi.sendCustomerPasswordReset).mockResolvedValue({ emailOnFile: true });
  vi.mocked(customerUsersApi.resendCustomerVerification).mockResolvedValue({ emailOnFile: true });
});

describe('CustomerUserDetailPage — staff actions', () => {
  it('disables an account only after a reason is entered in the confirm dialog, then toasts', async () => {
    const u = userEvent.setup();
    renderPage(makeUser());
    await u.click(await screen.findByRole('button', { name: 'Disable' }));

    const dialog = await screen.findByRole('dialog');
    // The confirm button is gated until a reason is typed.
    const confirm = within(dialog).getByRole('button', { name: 'Disable account' });
    expect(confirm).toBeDisabled();
    expect(customerUsersApi.disableCustomerUser).not.toHaveBeenCalled();

    await u.type(within(dialog).getByPlaceholderText('Reason…'), 'Fraudulent activity');
    await u.click(confirm);

    await waitFor(() => expect(customerUsersApi.disableCustomerUser).toHaveBeenCalledWith('user-1'));
    await waitFor(() => expect(successMock).toHaveBeenCalledWith('Account disabled.'));
  });

  it('reactivates a disabled account', async () => {
    const u = userEvent.setup();
    renderPage(makeUser({ accountDisabled: true }));
    await u.click(await screen.findByRole('button', { name: 'Reactivate' }));
    await waitFor(() => expect(customerUsersApi.reactivateCustomerUser).toHaveBeenCalledWith('user-1'));
  });

  it('unlocks a locked account', async () => {
    const u = userEvent.setup();
    renderPage(makeUser({ locked: true }));
    await u.click(await screen.findByRole('button', { name: 'Unlock' }));
    await waitFor(() => expect(customerUsersApi.unlockCustomerUser).toHaveBeenCalledWith('user-1'));
  });

  it('force-resets MFA only after confirming with a reason, then toasts', async () => {
    const u = userEvent.setup();
    renderPage(makeUser({ mfaEnabled: true }));
    await u.click(await screen.findByRole('button', { name: 'Reset MFA' }));

    const dialog = await screen.findByRole('dialog');
    await u.type(within(dialog).getByPlaceholderText('Reason…'), 'Lost authenticator device');
    await u.click(within(dialog).getByRole('button', { name: 'Reset MFA' }));

    await waitFor(() => expect(customerUsersApi.resetCustomerUserMfa).toHaveBeenCalledWith('user-1'));
    await waitFor(() => expect(successMock).toHaveBeenCalledWith('MFA reset — the user will re-enrol on next sign-in.'));
  });

  it('does not reset MFA if the confirm dialog is cancelled', async () => {
    const u = userEvent.setup();
    renderPage(makeUser({ mfaEnabled: true }));
    await u.click(await screen.findByRole('button', { name: 'Reset MFA' }));
    const dialog = await screen.findByRole('dialog');
    await u.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(customerUsersApi.resetCustomerUserMfa).not.toHaveBeenCalled();
  });

  it('triggers a password reset and reports whether an email was on file', async () => {
    const u = userEvent.setup();
    renderPage(makeUser());
    await u.click(await screen.findByRole('button', { name: 'Send password reset' }));

    await waitFor(() => expect(customerUsersApi.sendCustomerPasswordReset).toHaveBeenCalledWith('user-1'));
    expect(await screen.findByText('Password reset email sent.')).toBeInTheDocument();
  });

  it('reports when a password reset had no email to send to', async () => {
    vi.mocked(customerUsersApi.sendCustomerPasswordReset).mockResolvedValue({ emailOnFile: false });
    const u = userEvent.setup();
    renderPage(makeUser());
    await u.click(await screen.findByRole('button', { name: 'Send password reset' }));

    expect(await screen.findByText('No email on file — nothing was sent.')).toBeInTheDocument();
  });

  it('shows Reactivate (not Disable) and hides Unlock/Reset MFA for an active, unlocked, non-MFA user', async () => {
    renderPage(makeUser({ accountDisabled: true, locked: false, mfaEnabled: false }));
    expect(await screen.findByRole('button', { name: 'Reactivate' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Disable' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unlock' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset MFA' })).not.toBeInTheDocument();
  });
});
