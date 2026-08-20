import { apiClient } from './client';

/**
 * Admin-managed feature flags evaluated for the current user's company
 * (`GET /v1/feature-flags` → `{ [key]: enabled }`). Every authenticated user of
 * any role sees the same evaluated map for their company — no permission gates
 * it. A key absent from the map means the backend has no flag row for it, which
 * the API treats as "enabled" (fail-open); consumers should mirror that.
 */
export type FeatureFlagMap = Record<string, boolean>;

export async function getFeatureFlags(): Promise<FeatureFlagMap> {
  const { data } = await apiClient.get<FeatureFlagMap>('/v1/feature-flags');
  return data;
}
