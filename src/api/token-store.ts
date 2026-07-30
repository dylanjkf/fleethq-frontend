const STORAGE_KEY = 'fleethq.accessToken';

type Listener = (token: string | null) => void;
const listeners = new Set<Listener>();

/**
 * The one place the session token is read/written. Kept out of React state so
 * the axios client (a plain module, not a component) can read it without a
 * context dependency — AuthProvider subscribes to stay in sync instead of
 * being the source of truth itself.
 */
export const tokenStore = {
  get(): string | null {
    return localStorage.getItem(STORAGE_KEY);
  },
  set(token: string): void {
    localStorage.setItem(STORAGE_KEY, token);
    listeners.forEach((l) => l(token));
  },
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    listeners.forEach((l) => l(null));
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
