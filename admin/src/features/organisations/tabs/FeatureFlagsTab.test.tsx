import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as flagsApi from '@/api/feature-flags';
import type { OrganisationFeatureFlag } from '@/api/types';
import { FeatureFlagsTab } from './FeatureFlagsTab';

/**
 * Audit Part 8 (item 2): the cockpit's "Feature-flag overrides" card reads the
 * same overrides this tab edits, so toggling a flag here must invalidate the
 * cockpit query too — otherwise the Cockpit tab shows a stale override list. This
 * asserts the toggle calls setFeatureFlagOverride AND invalidates the
 * organisation-cockpit query key (not just the feature-flags one).
 */
vi.mock('@/api/feature-flags');

const FLAG: OrganisationFeatureFlag = {
  id: 'flag-1',
  key: 'beta_x',
  name: 'Beta X',
  description: 'A beta feature',
  globalEnabled: false,
  override: null,
  effective: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(flagsApi.listOrganisationFeatureFlags).mockResolvedValue([FLAG]);
  vi.mocked(flagsApi.setFeatureFlagOverride).mockResolvedValue(undefined);
});

describe('FeatureFlagsTab — cockpit query invalidation', () => {
  it('invalidates the organisation-cockpit query when a flag is toggled', async () => {
    const user = userEvent.setup();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

    render(
      <QueryClientProvider client={qc}>
        <FeatureFlagsTab companyId="co-1" />
      </QueryClientProvider>,
    );

    await user.click(await screen.findByRole('button', { name: 'Enable' }));

    await waitFor(() => expect(flagsApi.setFeatureFlagOverride).toHaveBeenCalledWith('co-1', 'beta_x', true));
    // Both the feature-flags list AND the cockpit view are refreshed.
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['organisation-cockpit', 'co-1'] }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['organisation-feature-flags', 'co-1'] });
  });
});
