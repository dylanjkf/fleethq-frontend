/**
 * Auth/Billing Platform Phase 9 (usage & feature limit depth): before this,
 * the only signal a company got that it was near a plan limit was a failed
 * create request's 402 toast — the entitlements response never reported
 * usage at all. Now that it does (`Entitlements.usage`), this computes a
 * proactive warning once a resource crosses 80% of its plan limit.
 */
export interface UsageWarning {
  resource: 'assets' | 'operators';
  current: number;
  limit: number;
  atLimit: boolean;
}

const NEAR_LIMIT_THRESHOLD = 0.8;

export function getUsageWarnings(
  usage: { operators: number; assets: number },
  limits: { maxOperators: number | null; maxAssets: number | null },
): UsageWarning[] {
  const warnings: UsageWarning[] = [];
  const check = (resource: 'assets' | 'operators', current: number, limit: number | null) => {
    if (limit == null || limit <= 0) return;
    if (current >= limit * NEAR_LIMIT_THRESHOLD) {
      warnings.push({ resource, current, limit, atLimit: current >= limit });
    }
  };
  check('assets', usage.assets, limits.maxAssets);
  check('operators', usage.operators, limits.maxOperators);
  return warnings;
}

export function usageWarningMessage(warning: UsageWarning): string {
  return warning.atLimit
    ? `You've reached your plan's limit of ${warning.limit} ${warning.resource} (${warning.current} in use). Upgrade to add more.`
    : `You're using ${warning.current} of ${warning.limit} ${warning.resource} on your plan — approaching the limit.`;
}
