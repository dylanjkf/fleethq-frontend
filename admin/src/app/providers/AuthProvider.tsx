import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authApi from '@/api/auth';
import { setUnauthorizedHandler } from '@/api/client';
import { tokenStore } from '@/api/token-store';
import { queryClient } from '@/app/query-client';
import type { AdminLoginResult, AdminMe } from '@/api/types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  status: AuthStatus;
  admin: AdminMe | null;
  login: (username: string, password: string) => Promise<AdminLoginResult>;
  verifyMfa: (mfaToken: string, code: string, rememberDevice: boolean) => Promise<AdminLoginResult>;
  logout: () => Promise<void>;
  hasPermission: (key: string) => boolean;
  refreshMe: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [admin, setAdmin] = useState<AdminMe | null>(null);

  const loadMe = useCallback(async () => {
    try {
      const me = await authApi.getMe();
      setAdmin(me);
      setStatus('authenticated');
    } catch {
      tokenStore.clear();
      setAdmin(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    if (tokenStore.get()) {
      void loadMe();
    } else {
      setStatus('unauthenticated');
    }
  }, [loadMe]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      // Drop every cached query so a 401 (session expired / revoked) can't leave
      // one staff member's fetched data (customer, billing) visible to whoever
      // signs in next on a shared machine.
      queryClient.clear();
      setAdmin(null);
      setStatus('unauthenticated');
    });
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await authApi.login(username, password, authApi.getOrCreateDeviceFingerprint());
      if (result.status === 'authenticated') {
        tokenStore.set(result.accessToken);
        await loadMe();
      }
      return result;
    },
    [loadMe],
  );

  const verifyMfa = useCallback(
    async (mfaToken: string, code: string, rememberDevice: boolean) => {
      const result = await authApi.verifyMfa(mfaToken, code, rememberDevice);
      if (result.status === 'authenticated') {
        tokenStore.set(result.accessToken);
        await loadMe();
      }
      return result;
    },
    [loadMe],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      // Clear the React Query cache on the way out — without this the next staff
      // member to sign in on a shared/kiosk machine can briefly see the previous
      // user's cached customer/billing data before their own fetches land.
      queryClient.clear();
      tokenStore.clear();
      setAdmin(null);
      setStatus('unauthenticated');
    }
  }, []);

  const hasPermission = useCallback((key: string) => !!admin?.permissions.includes(key), [admin]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, admin, login, verifyMfa, logout, hasPermission, refreshMe: loadMe }),
    [status, admin, login, verifyMfa, logout, hasPermission, loadMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
