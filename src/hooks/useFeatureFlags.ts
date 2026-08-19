import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFeatureFlags, type FeatureFlagMap } from '@/api/featureFlags';
import { useAuth } from '@/hooks/useAuth';

/**
 * The single hook every feature-flag-aware nav item, page, and route gate should
 * use — the admin-managed rollout axis (`@RequireFeatureFlag` server-side),
 * distinct from permissions (what the user may do) and billing entitlements
 * (what the plan includes). Fetched once per session and cached; every role in a
 * company sees the same evaluated map.
 */
export function useFeatureFlags() {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ['feature-flags'],
    queryFn: getFeatureFlags,
    // Only meaningful for an authenticated user; the endpoint is 401 otherwise.
    enabled: status === 'authenticated',
    staleTime: 5 * 60 * 1000,
  });

  const data: FeatureFlagMap | undefined = query.data;

  /**
   * Whether an admin-managed flag is on for this company.
   *  - loaded + key present → its value.
   *  - loaded + key ABSENT → `true`: the backend returns no row for it and its
   *    `@RequireFeatureFlag` guard fails open, so the route is reachable; the
   *    UI must match or it would hide a working module.
   *  - still loading → `false`: a hidden-by-default module must not flash in
   *    and then vanish once the real map arrives.
   *
   * Stable across renders (keyed on the fetched map) so callers can safely list
   * it in a `useMemo`/`useCallback` dependency array.
   */
  const isEnabled = useCallback((key: string): boolean => (data ? (data[key] ?? true) : false), [data]);

  return { isLoading: query.isLoading, flags: data, isEnabled };
}
