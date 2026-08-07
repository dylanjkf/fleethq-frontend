import type { ReactNode } from 'react';
import { AuthContext, type AuthContextValue } from '@/app/providers/AuthProvider';
import type { AdminMe } from '@/api/types';

/** A fully-formed AdminMe fixture; override just the fields a test cares about. */
export function makeAdmin(overrides: Partial<AdminMe> = {}): AdminMe {
  return {
    id: 'admin-1',
    username: 'staff.member',
    email: 'staff@fleethq.internal',
    fullName: 'Staff Member',
    mfaEnabled: true,
    mustResetPassword: false,
    role: { id: 'role-support', name: 'Support' },
    permissions: [],
    obligations: { passwordReset: false, mfaEnrollment: false },
    ...overrides,
  };
}

/**
 * A ready-to-use AuthContextValue whose `hasPermission` is derived from the
 * admin's real permission list — so a denial-path test that passes an admin
 * with no permissions actually exercises the same predicate the app uses.
 */
export function makeAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  const admin = 'admin' in overrides ? (overrides.admin ?? null) : makeAdmin();
  return {
    status: admin ? 'authenticated' : 'unauthenticated',
    admin,
    login: async () => ({ status: 'authenticated', accessToken: 't', admin: { id: 'x', username: 'x', fullName: 'x', mustResetPassword: false } }),
    verifyMfa: async () => ({ status: 'authenticated', accessToken: 't', admin: { id: 'x', username: 'x', fullName: 'x', mustResetPassword: false } }),
    logout: async () => {},
    hasPermission: (key: string) => !!admin?.permissions.includes(key),
    refreshMe: async () => {},
    ...overrides,
  };
}

export function AuthWrapper({ value, children }: { value: AuthContextValue; children: ReactNode }) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
