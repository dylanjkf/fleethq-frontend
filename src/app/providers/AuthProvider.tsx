import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { startAuthentication } from '@simplewebauthn/browser';
import * as authApi from '@/api/auth';
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
  login: (username: string, password: string, rememberMe?: boolean) => Promise<LoginResult>;
  selectCompany: (preAuthToken: string, companyId: string) => Promise<LoginResult>;
  /** Complete an MFA login with the challenge token + a TOTP/backup code. */
  verifyMfa: (mfaToken: string, code: string, rememberDevice?: boolean) => Promise<LoginResult>;
  /** Passwordless login from a clicked magic-link (?token=...). */
  loginWithMagicLink: (token: string, rememberMe?: boolean) => Promise<LoginResult>;
  /** A verified id_token from Google/Microsoft's own client-side SDK. */
  loginWithOAuth: (provider: 'google' | 'microsoft', idToken: string, rememberMe?: boolean) => Promise<LoginResult>;
  /** Usernameless passkey login — drives the browser's own credential picker. */
  loginWithPasskey: () => Promise<LoginResult>;
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

  const login = useCallback(async (username: string, password: string, rememberMe?: boolean) => {
    const result = await authApi.login(username, password, authApi.getOrCreateDeviceFingerprint(), rememberMe);
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

  const verifyMfa = useCallback(async (mfaToken: string, code: string, rememberDevice?: boolean) => {
    const result = await authApi.verifyMfa(mfaToken, code, rememberDevice);
    if (result.status === 'authenticated') {
      tokenStore.set(result.accessToken);
      await loadCurrentUser();
    }
    return result;
  }, [loadCurrentUser]);

  const loginWithMagicLink = useCallback(async (token: string, rememberMe?: boolean) => {
    const result = await authApi.consumeMagicLink(token, authApi.getOrCreateDeviceFingerprint(), rememberMe);
    if (result.status === 'authenticated') {
      tokenStore.set(result.accessToken);
      await loadCurrentUser();
    }
    return result;
  }, [loadCurrentUser]);

  const loginWithOAuth = useCallback(async (provider: 'google' | 'microsoft', idToken: string, rememberMe?: boolean) => {
    const result = await authApi.loginWithOAuth(provider, idToken, authApi.getOrCreateDeviceFingerprint(), rememberMe);
    if (result.status === 'authenticated') {
      tokenStore.set(result.accessToken);
      await loadCurrentUser();
    }
    return result;
  }, [loadCurrentUser]);

  const loginWithPasskey = useCallback(async () => {
    const { options, challengeToken } = await authApi.beginWebauthnLogin();
    const response = await startAuthentication({ optionsJSON: options });
    const result = await authApi.verifyWebauthnLogin(challengeToken, response);
    if (result.status === 'authenticated') {
      tokenStore.set(result.accessToken);
      await loadCurrentUser();
    }
    return result;
  }, [loadCurrentUser]);

  const logout = useCallback(() => {
    // Best-effort — revoke the session server-side, but a slow/failed request
    // must never block the local sign-out.
    void authApi.logout().catch(() => undefined);
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
    () => ({ status, user, can, login, selectCompany, verifyMfa, loginWithMagicLink, loginWithOAuth, loginWithPasskey, logout }),
    [status, user, can, login, selectCompany, verifyMfa, loginWithMagicLink, loginWithOAuth, loginWithPasskey, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
