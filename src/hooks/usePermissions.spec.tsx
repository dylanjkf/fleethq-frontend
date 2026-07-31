import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthContext, type AuthContextValue } from '@/app/providers/AuthProvider';
import { usePermissions } from './usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import type { CurrentUser } from '@/api/types';

const testUser: CurrentUser = {
  userId: 'u1',
  username: 'test',
  fullName: 'Test User',
  company: { id: 'c1', name: 'Test Co', jurisdiction: 'AU' },
  membershipId: 'm1',
  role: { id: 'r1', name: 'Test Role' },
  permissions: [],
  mfaEnabled: false,
  operator: null,
};

function withAuth(granted: Set<string>, children: React.ReactNode) {
  const value: AuthContextValue = {
    status: 'authenticated',
    user: testUser,
    can: (permission) => granted.has(permission),
    login: async () => {
      throw new Error('not implemented in test');
    },
    selectCompany: async () => {
      throw new Error('not implemented in test');
    },
    verifyMfa: async () => {
      throw new Error('not implemented in test');
    },
    loginWithMagicLink: async () => {
      throw new Error('not implemented in test');
    },
    loginWithOAuth: async () => {
      throw new Error('not implemented in test');
    },
    loginWithPasskey: async () => {
      throw new Error('not implemented in test');
    },
    logout: () => {},
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function Probe() {
  const { can, canAny, canAll, role } = usePermissions();
  return (
    <div>
      <span data-testid="can-view">{String(can(PERMISSIONS.ASSETS_VIEW))}</span>
      <span data-testid="can-create">{String(can(PERMISSIONS.ASSETS_CREATE))}</span>
      <span data-testid="can-any">{String(canAny([PERMISSIONS.ASSETS_CREATE, PERMISSIONS.ASSETS_VIEW]))}</span>
      <span data-testid="can-all">{String(canAll([PERMISSIONS.ASSETS_CREATE, PERMISSIONS.ASSETS_VIEW]))}</span>
      <span data-testid="role">{role?.name}</span>
    </div>
  );
}

describe('usePermissions', () => {
  it('delegates single-permission checks to the auth context, never a hardcoded role check', () => {
    render(withAuth(new Set([PERMISSIONS.ASSETS_VIEW]), <Probe />));
    expect(screen.getByTestId('can-view')).toHaveTextContent('true');
    expect(screen.getByTestId('can-create')).toHaveTextContent('false');
  });

  it('canAny is true if at least one permission is granted', () => {
    render(withAuth(new Set([PERMISSIONS.ASSETS_VIEW]), <Probe />));
    expect(screen.getByTestId('can-any')).toHaveTextContent('true');
  });

  it('canAll requires every permission to be granted', () => {
    render(withAuth(new Set([PERMISSIONS.ASSETS_VIEW]), <Probe />));
    expect(screen.getByTestId('can-all')).toHaveTextContent('false');

    render(withAuth(new Set([PERMISSIONS.ASSETS_VIEW, PERMISSIONS.ASSETS_CREATE]), <Probe />));
    expect(screen.getAllByTestId('can-all').at(-1)).toHaveTextContent('true');
  });

  it('exposes the current role name from the authenticated user', () => {
    render(withAuth(new Set(), <Probe />));
    expect(screen.getByTestId('role')).toHaveTextContent('Test Role');
  });

  it('throws outside an AuthProvider, rather than silently treating the caller as unauthenticated', () => {
    // usePermissions -> useAuth throws if there's no context, per useAuth.ts's
    // own guard — asserting this stays true matters because a silent
    // "no context = no permissions" fallback would be a much easier bug to
    // accidentally introduce than it sounds, and would fail open in the
    // dangerous direction if it check the wrong boolean.
    const OutsideProbe = () => {
      usePermissions();
      return null;
    };
    expect(() => render(<OutsideProbe />)).toThrow('useAuth must be used within AuthProvider');
  });
});
