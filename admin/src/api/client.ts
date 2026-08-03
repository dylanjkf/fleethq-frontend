import axios, { type AxiosError } from 'axios';
import { tokenStore } from './token-store';
import type { ApiErrorBody } from './types';

/** Normalized client-side error — status 0 means "no response at all" (network failure), never a real server verdict. */
export class ApiClientError extends Error {
  code: string;
  status: number;
  details: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * The admin SPA is a separate deployable from the API (own origin in
 * production, e.g. served under fleethq.online/admin → api.fleethq.online).
 *
 * Base URL resolution, in order:
 *   1. VITE_API_BASE — admin-specific override, if you deliberately point the
 *      admin console at a different API.
 *   2. VITE_API_URL — the SAME variable the customer app uses, so one env var
 *      on a shared Vercel project configures both apps. Without this fallback
 *      the admin build defaulted to `/` and POSTed the login to the static
 *      host, which returns 405 (Method Not Allowed) instead of reaching the API.
 *   3. `/` — local dev, where vite.config.ts's proxy forwards to localhost:3000.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || '/',
  timeout: 30_000,
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status ?? 0;
    const body = error.response?.data?.error;

    if (status === 401) {
      tokenStore.clear();
      onUnauthorized?.();
    }

    const { code = 'NETWORK_ERROR', message = error.message, ...details } = body ?? {};
    return Promise.reject(new ApiClientError(status, code, message, details));
  },
);
