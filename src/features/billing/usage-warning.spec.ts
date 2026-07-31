import { describe, expect, it } from 'vitest';
import { getUsageWarnings, usageWarningMessage } from './usage-warning';

describe('getUsageWarnings', () => {
  it('returns nothing when usage is well under the limit', () => {
    expect(getUsageWarnings({ assets: 2, operators: 1 }, { maxAssets: 10, maxOperators: 10 })).toEqual([]);
  });

  it('returns nothing for an unlimited (null) limit no matter the usage', () => {
    expect(getUsageWarnings({ assets: 1000, operators: 1000 }, { maxAssets: null, maxOperators: null })).toEqual([]);
  });

  it('warns once usage crosses 80% of a finite limit, but not at-limit', () => {
    const warnings = getUsageWarnings({ assets: 8, operators: 0 }, { maxAssets: 10, maxOperators: 10 });
    expect(warnings).toEqual([{ resource: 'assets', current: 8, limit: 10, atLimit: false }]);
  });

  it('flags atLimit once usage reaches the limit', () => {
    const warnings = getUsageWarnings({ assets: 10, operators: 0 }, { maxAssets: 10, maxOperators: 10 });
    expect(warnings).toEqual([{ resource: 'assets', current: 10, limit: 10, atLimit: true }]);
  });

  it('reports both resources independently when both are near their limits', () => {
    const warnings = getUsageWarnings({ assets: 9, operators: 10 }, { maxAssets: 10, maxOperators: 10 });
    expect(warnings).toHaveLength(2);
    expect(warnings.find((w) => w.resource === 'assets')).toMatchObject({ atLimit: false });
    expect(warnings.find((w) => w.resource === 'operators')).toMatchObject({ atLimit: true });
  });
});

describe('usageWarningMessage', () => {
  it('phrases an at-limit warning as reached, and a near-limit one as approaching', () => {
    expect(usageWarningMessage({ resource: 'assets', current: 10, limit: 10, atLimit: true })).toMatch(/reached your plan's limit/);
    expect(usageWarningMessage({ resource: 'assets', current: 8, limit: 10, atLimit: false })).toMatch(/approaching the limit/);
  });
});
