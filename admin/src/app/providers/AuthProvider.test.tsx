import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { useAuth } from '@/hooks/useAuth';
import { tokenStore } from '@/api/token-store';
import { queryClient } from '@/app/query-client';
import * as clientMod from '@/api/client';
import { makeAdmin } from '@/test/auth';

// Mock the network layer so we exercise the AuthProvider state machine only.
vi.mock('@/api/auth', () => ({
  getMe: vi.fn(),
  login: vi.fn(),
  verifyMfa: vi.fn(),
  logout: vi.fn(),
  getOrCreateDeviceFingerprint: vi.fn(() => 'device-fp'),
}));
import * as authApi from '@/api/auth';

function Consumer() {
  const { status, admin, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="user">{admin?.username ?? 'none'}</span>
      <button onClick={() => void login('u', 'p')}>login</button>
      <button onClick={() => void logout()}>logout</button>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  queryClient.clear();
});

describe('AuthProvider (login / logout / 401 — auth flow + cache hygiene)', () => {
  it('starts unauthenticated when no token is stored', async () => {
    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
  });

  it('logs in: stores the token and loads the current admin', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      status: 'authenticated',
      accessToken: 'tok-123',
      admin: { id: 'a', username: 'staff.member', fullName: 'Staff', mustResetPassword: false },
    });
    vi.mocked(authApi.getMe).mockResolvedValue(makeAdmin({ username: 'staff.member' }));

    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));

    await userEvent.click(screen.getByText('login'));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('user')).toHaveTextContent('staff.member');
    expect(tokenStore.get()).toBe('tok-123');
  });

  it('logout clears the token, the identity, AND the React Query cache (H5)', async () => {
    tokenStore.set('tok-existing');
    vi.mocked(authApi.getMe).mockResolvedValue(makeAdmin({ username: 'staff.member' }));
    vi.mocked(authApi.logout).mockResolvedValue(undefined as never);
    // Seed the cache with a "previous user's" query so we can prove it's dropped.
    queryClient.setQueryData(['org', 'secret'], { name: 'Previous Customer' });

    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));

    const clearSpy = vi.spyOn(queryClient, 'clear');
    await userEvent.click(screen.getByText('logout'));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    expect(clearSpy).toHaveBeenCalled();
    expect(tokenStore.get()).toBeNull();
    expect(queryClient.getQueryData(['org', 'secret'])).toBeUndefined();
  });

  it('a 401 clears the cache and drops to unauthenticated (H5)', async () => {
    const handlerSpy = vi.spyOn(clientMod, 'setUnauthorizedHandler');
    tokenStore.set('tok-existing');
    vi.mocked(authApi.getMe).mockResolvedValue(makeAdmin({ username: 'staff.member' }));

    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));

    queryClient.setQueryData(['billing', 'secret'], { amount: 999 });
    const clearSpy = vi.spyOn(queryClient, 'clear');

    // Fire the unauthorized handler the client registered (what a real 401 triggers).
    const registered = handlerSpy.mock.calls.at(-1)?.[0];
    expect(registered).toBeTypeOf('function');
    act(() => registered!());

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    expect(clearSpy).toHaveBeenCalled();
    expect(queryClient.getQueryData(['billing', 'secret'])).toBeUndefined();
  });
});
