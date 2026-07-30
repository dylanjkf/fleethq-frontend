import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as authApi from '@/api/auth';
import { signup as signupApi, type SignupInput } from '@/api/companies';
import { setUnauthorizedHandler } from '@/api/client';
import { tokenStore } from '@/api/token-store';
import type { CurrentUser, LoginResult } from '@/api/types';
import type { PermissionKey } from '@/lib/permissions';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  status: AuthStatus;
  user: CurrentUser | null;
  /** Server-truth permission check — never a hardcoded role/name comparison. */
  can: (permission: PermissionKey) => boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  /** Self-service company creation — logs the new admin straight in on success. */
  signup: (input: SignupInput) => Promise<LoginResult>;
  selectCompany: (preAuthToken: string, companyId: string) => Promise<LoginResult>;
  /** Complete an MFA login with the challenge token + a TOTP/backup code. */
  verifyMfa: (mfaToken: string, code: string) => Promise<LoginResult>;
  logout: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<CurrentUser | null>(null);
  const queryClient = useQueryClient();

  const loadCurrentUser = useCallback(async () => {
    try {
      const me = await authApi.getMe();
      setUser(me);
      setStatus('authenticated');
    } catch {
      // The axios interceptor already clears the token on a 401; this covers
      // any other failure (network blip, malformed token) the same way.
      tokenStore.clear();
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    if (tokenStore.get()) {
      void loadCurrentUser();
    } else {
      setStatus('unauthenticated');
    }
  }, [loadCurrentUser]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus('unauthenticated');
      queryClient.clear();
    });
  }, [queryClient]);

  const login = useCallback(async (username: string, password: string) => {
    const result = await authApi.login(username, password);
    if (result.status === 'authenticated') {
      tokenStore.set(result.accessToken);
      await loadCurrentUser();
    }
    return result;
  }, [loadCurrentUser]);

  const signup = useCallback(async (input: SignupInput) => {
    const result = await signupApi(input);
    if (result.status === 'authenticated') {
      tokenStore.set(result.accessToken);
      await loadCurrentUser();
    }
    return result;
  }, [loadCurrentUser]);

  const selectCompany = useCallback(async (preAuthToken: string, companyId: string) => {
    const result = await authApi.selectCompany(preAuthToken, companyId);
    if (result.status === 'authenticated') {
      tokenStore.set(result.accessToken);
      await loadCurrentUser();
    }
    return result;
  }, [loadCurrentUser]);

  const verifyMfa = useCallback(async (mfaToken: string, code: string) => {
    const result = await authApi.verifyMfa(mfaToken, code);
    if (result.status === 'authenticated') {
      tokenStore.set(result.accessToken);
      await loadCurrentUser();
    }
    return result;
  }, [loadCurrentUser]);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus('unauthenticated');
    queryClient.clear();
  }, [queryClient]);

  const can = useCallback(
    (permission: PermissionKey) => user?.permissions.includes(permission) ?? false,
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, can, login, signup, selectCompany, verifyMfa, logout }),
    [status, user, can, login, signup, selectCompany, verifyMfa, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
