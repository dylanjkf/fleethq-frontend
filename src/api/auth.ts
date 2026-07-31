import type { AuthenticationResponseJSON, PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON, RegistrationResponseJSON } from '@simplewebauthn/browser';
import { apiClient } from './client';
import type { AuthProviders, CurrentUser, LoginResult, MfaSetup, PasskeySummary, SessionSummary } from './types';

export async function login(username: string, password: string, deviceFingerprint?: string, rememberMe?: boolean): Promise<LoginResult> {
  const { data } = await apiClient.post<LoginResult>('/v1/auth/login', { username, password, deviceFingerprint, rememberMe });
  return data;
}

/** Complete an MFA login: exchange the challenge token + a code for a session. */
export async function verifyMfa(mfaToken: string, code: string, rememberDevice?: boolean): Promise<LoginResult> {
  const { data } = await apiClient.post<LoginResult>('/v1/auth/mfa/verify', { mfaToken, code, rememberDevice });
  return data;
}

/** Begin MFA enrolment (authenticated): returns the secret + otpauth URI. */
export async function setupMfa(): Promise<MfaSetup> {
  const { data } = await apiClient.post<MfaSetup>('/v1/auth/mfa/setup');
  return data;
}

/** Confirm MFA enrolment with a code; returns one-time backup codes. */
export async function enableMfa(code: string): Promise<{ backupCodes: string[] }> {
  const { data } = await apiClient.post<{ backupCodes: string[] }>('/v1/auth/mfa/enable', { code });
  return data;
}

/** Disable MFA (requires a current code). */
export async function disableMfa(code: string): Promise<void> {
  await apiClient.post('/v1/auth/mfa/disable', { code });
}

export async function selectCompany(preAuthToken: string, companyId: string): Promise<LoginResult> {
  const { data } = await apiClient.post<LoginResult>('/v1/auth/select-company', {
    preAuthToken,
    companyId,
  });
  return data;
}

export async function getMe(): Promise<CurrentUser> {
  const { data } = await apiClient.get<CurrentUser>('/v1/auth/me');
  return data;
}

export async function requestPasswordReset(identifier: string): Promise<void> {
  await apiClient.post('/v1/auth/forgot-password', { identifier });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiClient.post('/v1/auth/reset-password', { token, newPassword });
}

export async function verifyEmail(token: string): Promise<void> {
  await apiClient.post('/v1/auth/verify-email', { token });
}

export async function resendVerification(identifier: string): Promise<void> {
  await apiClient.post('/v1/auth/resend-verification', { identifier });
}

export async function listSessions(): Promise<SessionSummary[]> {
  const { data } = await apiClient.get<SessionSummary[]>('/v1/auth/sessions');
  return data;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/v1/auth/sessions/${sessionId}`);
}

export async function logout(): Promise<void> {
  await apiClient.post('/v1/auth/logout');
}

/** A device fingerprint generated once per browser and persisted — lets a trusted device skip the MFA challenge. */
export function getOrCreateDeviceFingerprint(): string {
  const KEY = 'fleethq.deviceFingerprint';
  let value = localStorage.getItem(KEY);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(KEY, value);
  }
  return value;
}

/** Which passwordless/social sign-in options the login page should offer. */
export async function getAuthProviders(): Promise<AuthProviders> {
  const { data } = await apiClient.get<AuthProviders>('/v1/auth/providers');
  return data;
}

// ── Magic link ────────────────────────────────────────────────────────────

export async function requestMagicLink(identifier: string): Promise<void> {
  await apiClient.post('/v1/auth/magic-link/request', { identifier });
}

export async function consumeMagicLink(token: string, deviceFingerprint?: string, rememberMe?: boolean): Promise<LoginResult> {
  const { data } = await apiClient.post<LoginResult>('/v1/auth/magic-link/consume', { token, deviceFingerprint, rememberMe });
  return data;
}

// ── Social login ──────────────────────────────────────────────────────────

export async function loginWithOAuth(
  provider: 'google' | 'microsoft',
  idToken: string,
  deviceFingerprint?: string,
  rememberMe?: boolean,
): Promise<LoginResult> {
  const { data } = await apiClient.post<LoginResult>(`/v1/auth/oauth/${provider}/login`, { idToken, deviceFingerprint, rememberMe });
  return data;
}

// ── WebAuthn / passkeys ───────────────────────────────────────────────────

export async function beginWebauthnRegistration(): Promise<{ options: PublicKeyCredentialCreationOptionsJSON; challengeToken: string }> {
  const { data } = await apiClient.post('/v1/auth/webauthn/register/options');
  return data;
}

export async function verifyWebauthnRegistration(challengeToken: string, response: RegistrationResponseJSON, deviceLabel?: string): Promise<void> {
  await apiClient.post('/v1/auth/webauthn/register/verify', { challengeToken, response, deviceLabel });
}

export async function listPasskeys(): Promise<PasskeySummary[]> {
  const { data } = await apiClient.get<PasskeySummary[]>('/v1/auth/webauthn/credentials');
  return data;
}

export async function removePasskey(id: string): Promise<void> {
  await apiClient.delete(`/v1/auth/webauthn/credentials/${id}`);
}

/** Usernameless — no identifier needed; the platform's own credential picker handles it. */
export async function beginWebauthnLogin(): Promise<{ options: PublicKeyCredentialRequestOptionsJSON; challengeToken: string }> {
  const { data } = await apiClient.post('/v1/auth/webauthn/login/options');
  return data;
}

export async function verifyWebauthnLogin(challengeToken: string, response: AuthenticationResponseJSON): Promise<LoginResult> {
  const { data } = await apiClient.post<LoginResult>('/v1/auth/webauthn/login/verify', { challengeToken, response });
  return data;
}
