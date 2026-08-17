import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router';
import { ForgotPasswordPage, ResetPasswordPage } from '@/features/auth/AuthActionPages';
import { ApiClientError } from '@/api/client';
import * as authApi from '@/api/auth';

vi.mock('@/api/auth');

const NEUTRAL = /If an account matches, we've emailed a reset link to the address on file/i;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ForgotPasswordPage (non-enumerating reset request)', () => {
  it('shows the neutral confirmation on a successful request', async () => {
    vi.mocked(authApi.requestPasswordReset).mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByPlaceholderText(/Username or email/i), 'someone@example.com');
    await userEvent.click(screen.getByRole('button', { name: /Send reset link/i }));

    expect(await screen.findByText(NEUTRAL)).toBeInTheDocument();
  });

  it('shows the SAME neutral confirmation when the API rejects an unknown identifier', async () => {
    // A real (non-network) server response for an unknown account must not be
    // distinguishable from the success case.
    vi.mocked(authApi.requestPasswordReset).mockRejectedValue(
      new ApiClientError(404, 'NOT_FOUND', 'no such account'),
    );
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByPlaceholderText(/Username or email/i), 'ghost');
    await userEvent.click(screen.getByRole('button', { name: /Send reset link/i }));

    expect(await screen.findByText(NEUTRAL)).toBeInTheDocument();
    // And it does NOT leak the underlying "no such account" state.
    expect(screen.queryByText(/no such account/i)).not.toBeInTheDocument();
  });
});

describe('ResetPasswordPage (token-based completion)', () => {
  it('posts { token, newPassword } and routes to /login on success', async () => {
    vi.mocked(authApi.resetPassword).mockResolvedValue(undefined);
    render(
      <MemoryRouter initialEntries={['/reset-password?token=raw-token-123']}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/login" element={<div>LOGIN SCREEN</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByPlaceholderText(/^New password$/i), 'Str0ngPass!');
    await userEvent.type(screen.getByPlaceholderText(/Confirm new password/i), 'Str0ngPass!');
    await userEvent.click(screen.getByRole('button', { name: /Save new password/i }));

    expect(authApi.resetPassword).toHaveBeenCalledWith('raw-token-123', 'Str0ngPass!');
    expect(await screen.findByText(/Password updated/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('LOGIN SCREEN')).toBeInTheDocument(), { timeout: 3000 });
  });

  it('maps an INVALID_TOKEN error to the expired-link message', async () => {
    vi.mocked(authApi.resetPassword).mockRejectedValue(
      new ApiClientError(401, 'INVALID_TOKEN', 'invalid token'),
    );
    render(
      <MemoryRouter initialEntries={['/reset-password?token=stale']}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByPlaceholderText(/^New password$/i), 'Str0ngPass!');
    await userEvent.type(screen.getByPlaceholderText(/Confirm new password/i), 'Str0ngPass!');
    await userEvent.click(screen.getByRole('button', { name: /Save new password/i }));

    expect(await screen.findByText(/This reset link is invalid or has expired/i)).toBeInTheDocument();
  });
});
