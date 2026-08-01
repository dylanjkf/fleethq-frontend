import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

/**
 * "How do I actually connect a tracker?" — the answer, in the product.
 *
 * The ingest contract lived only in a one-time key dialog and as a bare path
 * (`/v1/gps/ingest`), which is not enough to configure a real device: you need
 * the **absolute** URL, the exact JSON field names, and a way to prove it works
 * before blaming the hardware. This panel is the durable, re-readable version of
 * that, and it deliberately includes the honest compatibility caveat — plenty of
 * cheap trackers cannot speak HTTP JSON at all, and telling someone that up
 * front saves them hours.
 *
 * The URL is derived from `window.location.origin` rather than a build-time env
 * var because the SPA is served from the same origin it proxies `/v1` to (see
 * api/client.ts) — so whatever host the operator is reading this on is, by
 * construction, the right host to send fixes to.
 */

/** Fields of the ingest payload, in the order a person fills them in. */
const PAYLOAD_FIELDS: { field: string; required: boolean; type: string; notes: string }[] = [
  { field: 'deviceKey', required: true, type: 'string', notes: 'The key shown once when you registered the tracker. Identifies the device and its company.' },
  { field: 'lat', required: true, type: 'number', notes: 'Latitude, WGS84 decimal degrees (e.g. -33.8688). Not "latitude".' },
  { field: 'lng', required: true, type: 'number', notes: 'Longitude, WGS84 decimal degrees (e.g. 151.2093). Not "lon" or "longitude".' },
  { field: 'speedKph', required: false, type: 'number', notes: 'Ground speed in km/h.' },
  { field: 'headingDeg', required: false, type: 'number', notes: 'Heading in degrees, 0–360.' },
  { field: 'recordedAt', required: false, type: 'ISO 8601 string', notes: 'When the fix was taken. Defaults to now — set it when flushing buffered fixes so history stays accurate.' },
];

/** Ingest failures a person will actually hit, and what to do about each. */
const TROUBLESHOOTING: { symptom: string; cause: string; fix: string }[] = [
  {
    symptom: 'HTTP 404, code GPS_DEVICE_UNKNOWN',
    cause: 'The deviceKey does not match any active tracker.',
    fix: 'Re-check for typos/whitespace. If the key was lost, use "Rotate key" to issue a new one — old keys stop working immediately.',
  },
  {
    symptom: 'HTTP 400, code BAD_TIMESTAMP',
    cause: '`recordedAt` is not a valid date.',
    fix: 'Send ISO 8601 (e.g. 2026-07-24T08:15:00Z), or omit the field to default to now.',
  },
  {
    symptom: 'HTTP 400 with validation messages',
    cause: 'A field name or type is wrong — most often `latitude`/`longitude` instead of `lat`/`lng`, or coordinates sent as strings.',
    fix: 'Match the payload table above exactly. lat/lng must be JSON numbers, not quoted strings.',
  },
  {
    symptom: 'HTTP 429',
    cause: 'The device is reporting faster than the per-device ingest limit.',
    fix: 'Increase the reporting interval on the device. Once every 30–60s is plenty for a live map.',
  },
  {
    symptom: '200 OK but "Last fix: never" in the table',
    cause: 'Almost always a second device/key, or the request is reaching a different environment.',
    fix: 'Confirm the host in the URL below matches this site, and that you are looking at the same tracker row you configured.',
  },
];

function CodeBlock({ text, onCopy }: { text: string; onCopy: (t: string) => void }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-(--border-subtle) bg-(--surface-2) p-2">
      <code className="flex-1 whitespace-pre-wrap break-all font-mono text-xs">{text}</code>
      <Button variant="ghost" size="icon" aria-label="Copy" onClick={() => onCopy(text)}>
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function GpsSetupGuide({ onCopy }: { onCopy: (text: string) => void }) {
  const [open, setOpen] = useState(false);

  // Same-origin by construction (see the component doc comment).
  const origin = typeof window === 'undefined' ? 'https://your-fleetos-host' : window.location.origin;
  const ingestUrl = `${origin}/v1/gps/ingest`;
  const curl = [
    `curl -X POST ${ingestUrl} \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -d '{"deviceKey":"PASTE_YOUR_DEVICE_KEY","lat":-33.8688,"lng":151.2093}'`,
  ].join('\n');

  return (
    <Card>
      <CardHeader className="pb-3">
        <button
          type="button"
          className="flex w-full items-center gap-2 text-left"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <HelpCircle className="h-4 w-4 shrink-0 text-(--text-tertiary)" />
          <CardTitle className="text-sm">How to connect a GPS tracker</CardTitle>
        </button>
      </CardHeader>

      {open && (
        <CardContent className="space-y-6 text-sm">
          {/* Steps */}
          <ol className="space-y-3">
            <li>
              <p className="font-medium">1. Register the tracker</p>
              <p className="text-(--text-tertiary)">
                Use <span className="font-medium">Register device</span> above. Copy the device key it shows —
                it is displayed <span className="font-medium">once</span> and only its hash is stored, so it
                cannot be recovered later (use “Rotate key” to issue a new one).
              </p>
            </li>
            <li>
              <p className="font-medium">2. Point the tracker at this URL</p>
              <p className="mb-2 text-(--text-tertiary)">
                Configure the device (or your telematics provider's webhook) to <code className="rounded bg-(--surface-2) px-1">POST</code>{' '}
                JSON here:
              </p>
              <CodeBlock text={ingestUrl} onCopy={onCopy} />
            </li>
            <li>
              <p className="font-medium">3. Send this JSON body</p>
              <p className="mb-2 text-(--text-tertiary)">
                No login or API token is needed — the device authenticates with its <code className="rounded bg-(--surface-2) px-1">deviceKey</code>{' '}
                in the body, so treat that key as a password.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PAYLOAD_FIELDS.map((f) => (
                    <TableRow key={f.field}>
                      <TableCell className="font-mono text-xs">{f.field}</TableCell>
                      <TableCell>
                        {f.required ? <Badge variant="warning">required</Badge> : <Badge variant="neutral">optional</Badge>}
                      </TableCell>
                      <TableCell className="text-xs">{f.type}</TableCell>
                      <TableCell className="text-xs text-(--text-tertiary)">{f.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </li>
            <li>
              <p className="font-medium">4. Prove it works before touching the hardware</p>
              <p className="mb-2 text-(--text-tertiary)">
                Paste your key into this command and run it from any terminal. A{' '}
                <code className="rounded bg-(--surface-2) px-1">{'{"accepted":true}'}</code> response means the
                pipeline works, and the tracker's <span className="font-medium">Last fix</span> below will turn
                green within a few seconds.
              </p>
              <CodeBlock text={curl} onCopy={onCopy} />
            </li>
          </ol>

          {/* The honest part. */}
          <div className="rounded-lg border border-(--border-subtle) bg-(--surface-2) p-3">
            <p className="font-medium">Will my tracker work?</p>
            <p className="mt-1 text-(--text-tertiary)">
              FleetHQ accepts an open HTTP JSON POST, which any of these can do:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-(--text-tertiary)">
              <li>A tracker with configurable <span className="font-medium">HTTP/HTTPS reporting</span> (many modern 4G units).</li>
              <li>Your telematics platform's <span className="font-medium">webhook / data forwarding</span> (Teltonika, Queclink, Samsara, Geotab and similar can all forward fixes).</li>
              <li>A small script or middleware you run, translating the device's protocol to the payload above.</li>
            </ul>
            <p className="mt-2 text-(--text-tertiary)">
              <span className="font-medium">Be aware:</span> many inexpensive trackers only speak a proprietary
              binary protocol over raw TCP/UDP and <span className="font-medium">cannot</span> POST JSON. Those
              need option two or three — the device alone won't do it, no matter how it's configured. If your
              tracker's manual has no "server URL / HTTP" setting, that's the situation you're in.
            </p>
            <p className="mt-2 text-(--text-tertiary)">
              You can also skip hardware entirely: DriverOS reports the driver's phone position while they're on
              shift, which is enough for a live map if you don't need ignition-off tracking.
            </p>
          </div>

          {/* Troubleshooting */}
          <div>
            <p className="mb-2 font-medium">If it isn't reporting</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>What you see</TableHead>
                  <TableHead>What it means</TableHead>
                  <TableHead>What to do</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TROUBLESHOOTING.map((t) => (
                  <TableRow key={t.symptom}>
                    <TableCell className="text-xs font-medium">{t.symptom}</TableCell>
                    <TableCell className="text-xs text-(--text-tertiary)">{t.cause}</TableCell>
                    <TableCell className="text-xs text-(--text-tertiary)">{t.fix}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
