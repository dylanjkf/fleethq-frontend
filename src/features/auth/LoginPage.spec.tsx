import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AuthContext, type AuthContextValue } from '@/app/providers/AuthProvider';
import { ApiClientError } from '@/api/client';
import { LoginPage } from './LoginPage';

const navigateMock = vi.fn();
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => navigateMock };
});

function renderWithAuth(overrides: Partial<AuthContextValue> = {}) {
  const value: AuthContextValue = {
    status: 'unauthenticated',
    user: null,
    can: () => false,
    login: vi.fn(),
    selectCompany: vi.fn(),
    verifyMfa: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };
  render(
    <MemoryRouter>
      <AuthContext.Provider value={value}>
        <LoginPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
  return value;
}

describe('LoginPage', () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  it('shows a validation error for each required field on an empty submit, without calling login', async () => {
    const user = userEvent.setup();
    const { login } = renderWithAuth();

    await user.click(screen.getByRole('button', { name: /log in|sign in/i }));

    expect(await screen.findAllByText('Required')).toHaveLength(2);
    expect(login).not.toHaveBeenCalled();
  });

  it('navigates home on a successful single-company login', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue({ status: 'authenticated', accessToken: 'token', company: { id: 'c1', name: 'Acme' } });
    renderWithAuth({ login });

    await user.type(screen.getByLabelText(/username/i), 'admin@acme');
    await user.type(screen.getByLabelText(/password/i), 'fleetos-dev-password');
    await user.click(screen.getByRole('button', { name: /log in|sign in/i }));

    await waitFor(() => expect(login).toHaveBeenCalledWith('admin@acme', 'fleetos-dev-password', false));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/', { replace: true }));
  });

  it("surfaces the API's error message rather than a generic failure when login is rejected", async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockRejectedValue(new ApiClientError(401, 'INVALID_CREDENTIALS', 'Incorrect username or password.'));
    renderWithAuth({ login });

    await user.type(screen.getByLabelText(/username/i), 'admin@acme');
    await user.type(screen.getByLabelText(/password/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /log in|sign in/i }));

    expect(await screen.findByText('Incorrect username or password.')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('presents a company picker instead of navigating when login resolves to multiple companies', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue({
      status: 'choose_company',
      preAuthToken: 'pre-auth-token',
      companies: [
        { id: 'c1', name: 'Acme Couriers' },
        { id: 'c2', name: 'Southern Star Logistics' },
      ],
    });
    renderWithAuth({ login });

    await user.type(screen.getByLabelText(/username/i), 'multi@company');
    await user.type(screen.getByLabelText(/password/i), 'password');
    await user.click(screen.getByRole('button', { name: /log in|sign in/i }));

    expect(await screen.findByText('Acme Couriers')).toBeInTheDocument();
    expect(screen.getByText('Southern Star Logistics')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
