import { apiClient } from './client';
import type { AdminLoginResult, AdminMe, AdminSessionSummary } from './types';

export async function login(username: string, password: string, deviceFingerprint?: string): Promise<AdminLoginResult> {
  const { data } = await apiClient.post<AdminLoginResult>('/v1/admin/auth/login', { username, password, deviceFingerprint });
  return data;
}

export async function verifyMfa(mfaToken: string, code: string, rememberDevice: boolean): Promise<AdminLoginResult> {
  const { data } = await apiClient.post<AdminLoginResult>('/v1/admin/auth/mfa/verify', { mfaToken, code, rememberDevice });
  return data;
}

export async function getMe(): Promise<AdminMe> {
  const { data } = await apiClient.get<AdminMe>('/v1/admin/auth/me');
  return data;
}

/**
 * Change the signed-in admin's own password. The server bumps tokenVersion (so
 * every other session is revoked) and returns a fresh access token the caller
 * must store in place of the old one.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<{ accessToken: string }> {
  const { data } = await apiClient.post<{ accessToken: string }>('/v1/admin/auth/change-password', { currentPassword, newPassword });
  return data;
}

/**
 * Kick off a staff-admin password reset. The endpoint is deliberately
 * non-enumerating — it always resolves 200 { ok: true } whether or not the
 * identifier (username OR email) matches an account, so callers must NOT branch
 * on the outcome to infer account existence.
 */
export async function requestPasswordReset(identifier: string): Promise<void> {
  await apiClient.post('/v1/admin/auth/forgot-password', { identifier });
}

/**
 * Complete a password reset with the raw token from the emailed link. On
 * failure the server returns a typed code the client-facing errors thrown here
 * preserve (via ApiClientError.code): INVALID_TOKEN (401), WEAK_PASSWORD (400),
 * PASSWORD_REUSED (400).
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiClient.post('/v1/admin/auth/reset-password', { token, newPassword });
}

export async function listSessions(): Promise<AdminSessionSummary[]> {
  const { data } = await apiClient.get<AdminSessionSummary[]>('/v1/admin/auth/sessions');
  return data;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/v1/admin/auth/sessions/${sessionId}`);
}

export async function logout(): Promise<void> {
  await apiClient.post('/v1/admin/auth/logout');
}

export async function setupMfa(): Promise<{ secret: string; otpauthUrl: string }> {
  const { data } = await apiClient.post<{ secret: string; otpauthUrl: string }>('/v1/admin/auth/mfa/setup');
  return data;
}

export async function enableMfa(code: string): Promise<{ backupCodes: string[] }> {
  const { data } = await apiClient.post<{ backupCodes: string[] }>('/v1/admin/auth/mfa/enable', { code });
  return data;
}

export async function disableMfa(code: string): Promise<void> {
  await apiClient.post('/v1/admin/auth/mfa/disable', { code });
}

export async function regenerateBackupCodes(code: string): Promise<{ backupCodes: string[] }> {
  const { data } = await apiClient.post<{ backupCodes: string[] }>('/v1/admin/auth/mfa/backup-codes/regenerate', { code });
  return data;
}

/** A device fingerprint generated once per browser and persisted — lets a trusted device skip the MFA challenge. */
export function getOrCreateDeviceFingerprint(): string {
  const KEY = 'fleethq-admin.deviceFingerprint';
  let value = localStorage.getItem(KEY);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(KEY, value);
  }
  return value;
}
