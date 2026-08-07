import { MutationCache, QueryClient } from '@tanstack/react-query';
import { ApiClientError } from '@/api/client';
import { pushToast } from '@/hooks/useToast';

/** Turn any thrown mutation error into a human-readable line for the toast. */
function describeError(error: unknown): string {
  if (error instanceof ApiClientError) {
    // status 0 is a network failure, never a real server verdict.
    if (error.status === 0) return 'Network error — the action may not have been applied. Check your connection and try again.';
    return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. The action may not have been applied.';
}

/**
 * The single QueryClient for the admin console. Exported (rather than created
 * inline in App.tsx) so the auth layer can call `queryClient.clear()` on logout
 * and on a 401 — otherwise the previous staff member's cached queries (customer
 * data, billing detail) linger in memory and can flash to the next person who
 * signs in on a shared/kiosk machine before their own fetches overwrite it.
 */
export const queryClient = new QueryClient({
  // Every failed mutation surfaces a visible error toast — no admin action can
  // fail silently. Per-mutation onSuccess handlers add success confirmations
  // for the destructive/financial actions; per-mutation onError is reserved
  // for inline affordances so errors are never double-reported here.
  mutationCache: new MutationCache({
    onError: (error) => {
      pushToast('error', describeError(error));
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000,
      refetchOnWindowFocus: false,
    },
  },
});
