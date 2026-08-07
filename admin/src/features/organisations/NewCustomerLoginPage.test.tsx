import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { NewCustomerLoginPage } from '@/features/organisations/NewCustomerLoginPage';
import { AuthContext } from '@/app/providers/AuthProvider';
import { makeAuth, makeAdmin } from '@/test/auth';

/**
 * C1 — high-consequence action (issuing a customer login provisions a new
 * tenant + first admin credential). Prove the denial path actually withholds
 * the form, not merely that the button is disabled.
 */
function renderPage(permissions: string[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const value = makeAuth({ admin: makeAdmin({ permissions }) });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthContext.Provider value={value}>
          <NewCustomerLoginPage />
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('NewCustomerLoginPage (issue customer login — permission-gated)', () => {
  it('withholds the issue-login form from an admin without organisations:create', () => {
    renderPage([]);
    expect(screen.getByText(/don't have permission to issue customer logins/i)).toBeInTheDocument();
    // The form and its submit action must not be reachable at all.
    expect(screen.queryByRole('button', { name: /issue login/i })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Acme Freight/i)).not.toBeInTheDocument();
  });

  it('renders the issue-login form for an admin who holds organisations:create', () => {
    renderPage(['organisations:create']);
    expect(screen.getByRole('button', { name: /issue login/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Acme Freight/i)).toBeInTheDocument();
  });
});
