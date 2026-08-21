import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '@/app/providers/AuthProvider';
import { ApiClientError } from '@/api/client';
import { makeAuth } from '@/test/auth';
import { LoginPage } from './LoginPage';

/**
 * Coverage for the admin login MFA-challenge UI (audit Part 5). The staff login
 * is a two-step flow — password, then a TOTP/backup-code challenge — and the
 * challenge half had no test, so a regression (the mfa_required branch not
 * switching the form, verifyMfa called with the wrong token/remember flag, an
 * invalid-code error swallowed) would ship unnoticed. login/verifyMfa are driven
 * through the real AuthContext so the component's own branching runs.
 */
const navigateMock = vi.fn();
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => navigateMock };
});

function renderWith(auth: ReturnType<typeof makeAuth>) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={auth}>
        <LoginPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  navigateMock.mockReset();
});

describe('admin LoginPage — MFA challenge', () => {
  it('goes straight to the app when a password login needs no second factor', async () => {
    const u = userEvent.setup();
    const login = vi.fn().mockResolvedValue({ status: 'authenticated', accessToken: 't', admin: { id: 'a', username: 'a', fullName: 'A', mustResetPassword: false } });
    renderWith(makeAuth({ login }));

    await u.type(screen.getByPlaceholderText('Username'), 'staff.member');
    await u.type(screen.getByPlaceholderText('Password'), 'hunter2!');
    await u.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(login).toHaveBeenCalledWith('staff.member', 'hunter2!'));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/', { replace: true }));
  });

  it('shows the code challenge when MFA is required, then verifies with the token and remember-device flag', async () => {
    const u = userEvent.setup();
    const login = vi.fn().mockResolvedValue({ status: 'mfa_required', mfaToken: 'mfatok-123' });
    const verifyMfa = vi.fn().mockResolvedValue({ status: 'authenticated', accessToken: 't', admin: { id: 'a', username: 'a', fullName: 'A', mustResetPassword: false } });
    renderWith(makeAuth({ login, verifyMfa }));

    await u.type(screen.getByPlaceholderText('Username'), 'staff.member');
    await u.type(screen.getByPlaceholderText('Password'), 'hunter2!');
    await u.click(screen.getByRole('button', { name: 'Sign in' }));

    // The UI switches to the authenticator-code step (password form is gone).
    expect(await screen.findByText('Enter your authenticator code')).toBeInTheDocument();
    const codeInput = screen.getByPlaceholderText('6-digit code or backup code');
    expect(screen.queryByPlaceholderText('Password')).not.toBeInTheDocument();

    await u.type(codeInput, '123456');
    await u.click(screen.getByLabelText('Remember this device for 30 days'));
    await u.click(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() => expect(verifyMfa).toHaveBeenCalledWith('mfatok-123', '123456', true));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/', { replace: true }));
  });

  it('surfaces an invalid-code error and does not navigate', async () => {
    const u = userEvent.setup();
    const login = vi.fn().mockResolvedValue({ status: 'mfa_required', mfaToken: 'mfatok-123' });
    const verifyMfa = vi.fn().mockRejectedValue(new ApiClientError(401, 'MFA_CODE_INVALID', 'That code is incorrect.'));
    renderWith(makeAuth({ login, verifyMfa }));

    await u.type(screen.getByPlaceholderText('Username'), 'staff.member');
    await u.type(screen.getByPlaceholderText('Password'), 'hunter2!');
    await u.click(screen.getByRole('button', { name: 'Sign in' }));

    await u.type(await screen.findByPlaceholderText('6-digit code or backup code'), '000000');
    await u.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText('That code is incorrect.')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
