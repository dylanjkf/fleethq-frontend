import type { ReactNode } from 'react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { NotFoundPage } from '@/features/shared/NotFoundPage';

/**
 * Route-level guard for an admin-managed feature flag. A direct URL visit to a
 * flag-gated page (e.g. `/warehouse`) must not slip past the hidden nav entry:
 * when the flag is off for this company the page renders the branded 404 instead
 * of the feature, mirroring the server-side `@RequireFeatureFlag` 403. While the
 * flag map is still loading we show a light spinner rather than flashing either
 * the feature or the 404.
 */
export function FeatureFlagGate({ flag, children }: { flag: string; children: ReactNode }) {
  const { isLoading, isEnabled } = useFeatureFlags();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (!isEnabled(flag)) {
    return <NotFoundPage />;
  }

  return <>{children}</>;
}
