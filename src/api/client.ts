import axios, { type AxiosError } from 'axios';
import { tokenStore } from './token-store';
import type { ApiErrorBody } from './types';

/** Normalized client-side error — every caller can rely on `.code`/`.message` existing. */
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
 * FleetHQ and the API are deployed to separate origins (Vercel + Railway —
 * see README.md "Deployment"), so the browser needs an absolute URL, not a
 * same-origin relative one. `VITE_API_URL` is baked in at build time (Vite
 * env vars always are) and must include the scheme, e.g.
 * `https://api.fleethq.online` — no trailing slash.
 *
 * In local dev this stays unset and falls back to `/`, which Vite's dev
 * server proxies to `http://localhost:3000` (see vite.config.ts) — local dev
 * and a real deployment both work without any per-environment code branch.
 */
const apiBaseUrl = import.meta.env.VITE_API_URL || '/';

export const apiClient = axios.create({ baseURL: apiBaseUrl });

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized: (() => void) | null = null;
/** Wired once by AuthProvider so a 401 anywhere logs the user out consistently. */
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

    const { code = 'UNKNOWN_ERROR', message = error.message, ...details } = body ?? {};
    return Promise.reject(new ApiClientError(status, code, message, details));
  },
);
