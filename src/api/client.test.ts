import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, ApiClientError, setUnauthorizedHandler } from './client';
import { tokenStore } from './token-store';

/**
 * Regression: the response interceptor used to force a logout on ANY 401. A
 * wrong (or space-grouped) second factor at the login MFA challenge comes back
 * as 401 MFA_CODE_INVALID — a retryable input error on a not-yet-signed-in flow,
 * not a dead session. Wiping state / calling the unauthorized handler on it
 * discarded the in-progress MFA challenge and bounced the customer all the way
 * back to the username/password step. The interceptor must skip the logout for
 * that one code and let it propagate as a normal error so the login screen can
 * show "that code is incorrect" and keep the mfaToken for an immediate retry.
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

  it('does NOT log out on a 401 MFA_CODE_INVALID — challenge state survives so the user can retry', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    stubStatus(401, 'MFA_CODE_INVALID');

    await expect(apiClient.get('/x')).rejects.toBeInstanceOf(ApiClientError);
    // The unauthorized handler is what resets the auth context / clears the query
    // cache — never called here, so the login page keeps its mfaToken.
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(tokenStore.get()).toBe('a-token'); // token untouched
  });

  it('DOES log out and clears the token on a generic 401 (real session expiry)', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    stubStatus(401, 'TOKEN_REVOKED');

    await expect(apiClient.get('/x')).rejects.toBeInstanceOf(ApiClientError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(tokenStore.get()).toBeNull();
  });
});
