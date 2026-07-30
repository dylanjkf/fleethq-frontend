import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GpsSetupGuide } from './GpsSetupGuide';

/**
 * The guide exists because a bare `/v1/gps/ingest` path wasn't enough to
 * configure a real tracker. These assertions pin the things that made it
 * unusable: the absolute URL, the exact field names, a runnable test command,
 * and the honest "your tracker might not support this" caveat.
 */
describe('GpsSetupGuide', () => {
  it('is collapsed by default so it does not crowd the device list', () => {
    render(<GpsSetupGuide onCopy={vi.fn()} />);
    expect(screen.getByText('How to connect a GPS tracker')).toBeInTheDocument();
    expect(screen.queryByText(/Point the tracker at this URL/)).not.toBeInTheDocument();
  });

  it('reveals the absolute ingest URL, not just the path', async () => {
    render(<GpsSetupGuide onCopy={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /How to connect a GPS tracker/ }));

    // jsdom's origin is http://localhost:3000 — the point is that a host is
    // present, so a device has somewhere to POST to.
    const expected = `${window.location.origin}/v1/gps/ingest`;
    expect(screen.getByText(expected)).toBeInTheDocument();
    expect(expected.startsWith('http')).toBe(true);
  });

  it('documents the exact payload field names that trip people up', async () => {
    render(<GpsSetupGuide onCopy={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /How to connect a GPS tracker/ }));

    // Scoped to the payload table (the first of the two tables) — `deviceKey`
    // also appears in the surrounding prose, so an unscoped query is ambiguous.
    const payloadTable = within(screen.getAllByRole('table')[0]);
    for (const field of ['deviceKey', 'lat', 'lng', 'speedKph', 'headingDeg', 'recordedAt']) {
      expect(payloadTable.getByText(field)).toBeInTheDocument();
    }
    // The classic mistake is `latitude`/`longitude`; the notes must call it out.
    expect(screen.getByText(/Not "latitude"/)).toBeInTheDocument();
  });

  it('offers a runnable curl and copies it on request', async () => {
    const onCopy = vi.fn();
    render(<GpsSetupGuide onCopy={onCopy} />);
    await userEvent.click(screen.getByRole('button', { name: /How to connect a GPS tracker/ }));

    const copyButtons = screen.getAllByRole('button', { name: 'Copy' });
    // Two copyable blocks: the ingest URL and the curl command.
    expect(copyButtons.length).toBe(2);
    await userEvent.click(copyButtons[1]);
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onCopy.mock.calls[0][0]).toContain('curl -X POST');
    expect(onCopy.mock.calls[0][0]).toContain('"lat"');
  });

  it('warns that many cheap trackers cannot POST JSON at all', async () => {
    render(<GpsSetupGuide onCopy={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /How to connect a GPS tracker/ }));
    expect(screen.getByText(/proprietary\s+binary protocol/)).toBeInTheDocument();
  });

  it('explains what each ingest failure means', async () => {
    render(<GpsSetupGuide onCopy={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /How to connect a GPS tracker/ }));
    expect(screen.getByText(/GPS_DEVICE_UNKNOWN/)).toBeInTheDocument();
    expect(screen.getByText(/HTTP 429/)).toBeInTheDocument();
  });
});
