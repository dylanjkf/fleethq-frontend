import { apiClient } from './client';
import type { CurrentUser, LoginResult, MfaSetup } from './types';

export async function login(username: string, password: string): Promise<LoginResult> {
  const { data } = await apiClient.post<LoginResult>('/v1/auth/login', { username, password });
  return data;
}

/** Complete an MFA login: exchange the challenge token + a code for a session. */
export async function verifyMfa(mfaToken: string, code: string): Promise<LoginResult> {
  const { data } = await apiClient.post<LoginResult>('/v1/auth/mfa/verify', { mfaToken, code });
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
