import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as reportsApi from '@/api/reports';
import { ImpactPage } from './ImpactPage';

/**
 * Regression for "the Impact charts aren't visible". The stacked-bar segments
 * render as HTML <div>s, so they must be coloured with a background utility
 * (`bg-*`). They were previously handed SVG-only `fill-*` classes, which set the
 * SVG `fill` presentation attribute and paint nothing on a div — so every bar
 * rendered invisible. These assertions pin the segments to `bg-*` and explicitly
 * forbid `fill-*`, so the invisible-bar regression can't come back silently.
 */
vi.mock('@/api/reports');

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ImpactPage />
    </QueryClientProvider>,
  );
}

const REPORT: reportsApi.ImpactReport = {
  range: { from: '2026-01-01T00:00:00.000Z', to: '2026-06-30T00:00:00.000Z', months: 6 },
  firstActivityAt: '2026-01-15T00:00:00.000Z',
  headline: {
    deliveriesProven: 120,
    deliveryRatePct: 98,
    onTimeRatePct: 96,
    checklistsCompleted: 60,
    checklistPassRatePct: 99,
    faultsTrackedToClosure: 8,
    maintenanceCostTracked: 4200,
    activeOperators: 5,
    activeAssets: 7,
    failedDeliveries: 2,
  },
  series: [
    { month: '2026-05', label: 'May', delivered: 40, failed: 1, deliveryRatePct: 98, onTimeRatePct: 95, checklists: 20, maintenanceCost: 1500 },
    { month: '2026-06', label: 'Jun', delivered: 55, failed: 2, deliveryRatePct: 96, onTimeRatePct: 97, checklists: 25, maintenanceCost: 2700 },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(reportsApi.getImpactReport).mockResolvedValue(REPORT);
});

describe('ImpactPage charts', () => {
  it('renders stacked-bar segments with a bg-* background utility, never an SVG-only fill-*', async () => {
    const { container } = renderPage();

    // Wait for the report to land and the "Delivered" chart to render.
    await waitFor(() => expect(screen.getByText('Deliveries handled each month')).toBeInTheDocument());

    // The delivered/failed segments are <div title="May: 40"> etc. Grab the
    // delivered segment for May (value 40) and the failed segment (value 1).
    const deliveredMay = container.querySelector('div[title="May: 40"]');
    const failedMay = container.querySelector('div[title="May: 1"]');

    expect(deliveredMay).not.toBeNull();
    expect(failedMay).not.toBeNull();

    // The bars must be painted with a background utility, not an SVG fill.
    expect(deliveredMay!.className).toContain('bg-accent-500');
    expect(deliveredMay!.className).not.toContain('fill-');
    expect(failedMay!.className).toContain('bg-danger-500');
    expect(failedMay!.className).not.toContain('fill-');
  });

  it('renders a coloured segment for every stacked-bar chart (checklists + maintenance too)', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(screen.getByText('Pre-start safety checks completed')).toBeInTheDocument());

    // Every div that carries a chart `title` is a bar segment; none may use fill-*.
    const segments = Array.from(container.querySelectorAll('div[title]'));
    expect(segments.length).toBeGreaterThan(0);
    for (const seg of segments) {
      expect(seg.className).toMatch(/\bbg-(accent|danger)-500\b/);
      expect(seg.className).not.toContain('fill-');
    }
  });
});
