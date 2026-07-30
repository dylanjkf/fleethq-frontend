import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AuthContext, type AuthContextValue } from '@/app/providers/AuthProvider';
import { ApiClientError } from '@/api/client';
import { SignupPage } from './SignupPage';

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
    signup: vi.fn(),
    selectCompany: vi.fn(),
    verifyMfa: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };
  render(
    <MemoryRouter>
      <AuthContext.Provider value={value}>
        <SignupPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
  return value;
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/company name/i), 'Rapid Dispatch Couriers');
  await user.type(screen.getByLabelText(/your name/i), 'Dana Ops');
  await user.type(screen.getByLabelText(/username/i), 'dana@rapid');
  await user.type(screen.getByLabelText(/^password$/i), 'a-strong-password');
  await user.type(screen.getByLabelText(/confirm password/i), 'a-strong-password');
}

describe('SignupPage', () => {
  beforeEach(() => navigateMock.mockClear());

  it('does not submit an empty form and requires the mandatory fields', async () => {
    const user = userEvent.setup();
    const { signup } = renderWithAuth();
    await user.click(screen.getByRole('button', { name: /create company/i }));
    expect(await screen.findAllByText('Required')).not.toHaveLength(0);
    expect(signup).not.toHaveBeenCalled();
  });

  it('blocks submission when the passwords do not match', async () => {
    const user = userEvent.setup();
    const { signup } = renderWithAuth();
    await user.type(screen.getByLabelText(/company name/i), 'Acme');
    await user.type(screen.getByLabelText(/your name/i), 'Dana');
    await user.type(screen.getByLabelText(/username/i), 'dana');
    await user.type(screen.getByLabelText(/^password$/i), 'a-strong-password');
    await user.type(screen.getByLabelText(/confirm password/i), 'different-password');
    await user.click(screen.getByRole('button', { name: /create company/i }));
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(signup).not.toHaveBeenCalled();
  });

  it('creates the company and navigates home on success (email omitted becomes undefined)', async () => {
    const user = userEvent.setup();
    const signup = vi.fn().mockResolvedValue({ status: 'authenticated', accessToken: 'tok', company: { id: 'c1', name: 'Rapid Dispatch Couriers' } });
    renderWithAuth({ signup });

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create company/i }));

    await waitFor(() =>
      expect(signup).toHaveBeenCalledWith({
        companyName: 'Rapid Dispatch Couriers',
        adminFullName: 'Dana Ops',
        adminUsername: 'dana@rapid',
        adminEmail: undefined,
        adminPassword: 'a-strong-password',
      }),
    );
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/', { replace: true }));
  });

  it("surfaces the API's error (e.g. username taken) and does not navigate", async () => {
    const user = userEvent.setup();
    const signup = vi.fn().mockRejectedValue(new ApiClientError(409, 'USERNAME_TAKEN', 'That username is already in use.'));
    renderWithAuth({ signup });

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create company/i }));

    expect(await screen.findByText('That username is already in use.')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
