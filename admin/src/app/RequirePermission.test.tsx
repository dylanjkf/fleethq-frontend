import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RequirePermission } from '@/app/ProtectedRoute';
import { AuthWrapper, makeAuth, makeAdmin } from '@/test/auth';

/**
 * C1 — permission gate. The dangerous failure mode is the *denial* path
 * silently letting gated content through, so these prove content is withheld
 * from an admin lacking the permission, not just that the happy path renders.
 */
describe('RequirePermission (admin permission gate)', () => {
  it('withholds gated content from a staff member without the permission', () => {
    const value = makeAuth({ admin: makeAdmin({ permissions: [] }) });
    render(
      <AuthWrapper value={value}>
        <RequirePermission permission="billing:manage">
          <div>SENSITIVE BILLING PANEL</div>
        </RequirePermission>
      </AuthWrapper>,
    );

    expect(screen.queryByText('SENSITIVE BILLING PANEL')).not.toBeInTheDocument();
    expect(screen.getByText(/don't have the/i)).toBeInTheDocument();
    // The missing permission is named so the operator understands why.
    expect(screen.getByText('billing:manage')).toBeInTheDocument();
  });

  it('does not leak content when the admin holds a *different* permission', () => {
    const value = makeAuth({ admin: makeAdmin({ permissions: ['organisations:read'] }) });
    render(
      <AuthWrapper value={value}>
        <RequirePermission permission="billing:manage">
          <div>SENSITIVE BILLING PANEL</div>
        </RequirePermission>
      </AuthWrapper>,
    );
    expect(screen.queryByText('SENSITIVE BILLING PANEL')).not.toBeInTheDocument();
  });

  it('renders gated content for a staff member who holds the permission', () => {
    const value = makeAuth({ admin: makeAdmin({ permissions: ['billing:manage'] }) });
    render(
      <AuthWrapper value={value}>
        <RequirePermission permission="billing:manage">
          <div>SENSITIVE BILLING PANEL</div>
        </RequirePermission>
      </AuthWrapper>,
    );
    expect(screen.getByText('SENSITIVE BILLING PANEL')).toBeInTheDocument();
  });
});
