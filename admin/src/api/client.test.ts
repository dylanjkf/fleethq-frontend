import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, ApiClientError, setUnauthorizedHandler } from './client';
import { tokenStore } from './token-store';

/**
 * Regression: the response interceptor used to force a logout on ANY 401. A
 * wrong second factor at the login MFA challenge comes back as 401
 * MFA_CODE_INVALID — a retryable input error, not a dead session — and wiping
 * the token on it threw an enrolling/logging-in admin all the way back to the
 * username/password screen. The interceptor must skip the logout for that one
 * code and let it propagate as a normal error.
 */
function stubStatus(status: number, code?: string) {
  apiClient.defaults.adapter = () =>
    Promise.reject({
      isAxiosError: true,
      response: { status, data: code ? { error: { code, message: 'nope' } } : undefined },
      config: {},
      message: 'stub',
    });
}

describe('apiClient 401 handling', () => {
  beforeEach(() => {
    tokenStore.set('a-token');
    vi.restoreAllMocks();
  });

  it('does NOT log out on a 401 MFA_CODE_INVALID — the session survives so the user can retry', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    stubStatus(401, 'MFA_CODE_INVALID');

    await expect(apiClient.get('/x')).rejects.toBeInstanceOf(ApiClientError);
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(tokenStore.get()).toBe('a-token'); // token untouched
  });

  it('DOES log out and clears the token on a generic 401 (real session expiry)', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    stubStatus(401, 'ADMIN_TOKEN_REVOKED');

    await expect(apiClient.get('/x')).rejects.toBeInstanceOf(ApiClientError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(tokenStore.get()).toBeNull();
  });
});
