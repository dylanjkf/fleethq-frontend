import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ApiClientError } from '@/api/client';
import { disableMfa, enableMfa, setupMfa } from '@/api/auth';

type Mode = 'idle' | 'enrolling' | 'backup';

/**
 * Self-service MFA (TOTP) enrolment on the profile page. Two-step commit: begin
 * setup to get a secret, add it to an authenticator app, then confirm a code to
 * activate — after which one-time backup codes are shown exactly once.
 *
 * `requiredByCompany` (Auth/Billing Platform Phase 3) disables "Disable" —
 * this account's company mandates MFA, so turning it off here would just get
 * the user redirected straight back into forced enrolment at next sign-in.
 */
export function MfaCard({ initiallyEnabled, requiredByCompany }: { initiallyEnabled: boolean; requiredByCompany: boolean }) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [mode, setMode] = useState<Mode>('idle');
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setMode('idle');
    setSecret(null);
    setCode('');
    setBackupCodes([]);
    setError(null);
  }

  async function begin() {
    setError(null);
    setBusy(true);
    try {
      const { secret: s } = await setupMfa();
      setSecret(s);
      setMode('enrolling');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not start setup.');
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setError(null);
    setBusy(true);
    try {
      const { backupCodes: codes } = await enableMfa(code.trim());
      setBackupCodes(codes);
      setEnabled(true);
      setMode('backup');
      setCode('');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'That code is incorrect.');
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setError(null);
    setBusy(true);
    try {
      await disableMfa(code.trim());
      setEnabled(false);
      reset();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'That code is incorrect.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>An authenticator app code required at sign-in.</CardDescription>
        </div>
        <Badge variant={enabled ? 'success' : 'neutral'}>{enabled ? 'Enabled' : 'Off'}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* Enrolment: show the secret for manual authenticator entry, then confirm a code. */}
        {mode === 'enrolling' && secret && (
          <div className="space-y-2">
            <p className="text-(--text-secondary)">
              In your authenticator app (Google Authenticator, Authy, 1Password…), add an account and enter this key:
            </p>
            <code className="block break-all rounded bg-(--surface-2) px-2 py-1 font-mono text-(--text-primary)">{secret}</code>
            <p className="text-(--text-secondary)">Then enter the 6-digit code it shows:</p>
            <Input inputMode="numeric" autoComplete="one-time-code" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={confirm} disabled={busy || code.trim().length < 6}>
                {busy ? 'Verifying…' : 'Confirm & enable'}
              </Button>
              <Button variant="secondary" onClick={reset} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Backup codes shown once after enabling. */}
        {mode === 'backup' && (
          <div className="space-y-2">
            <p className="font-medium text-(--text-primary)">Save your backup codes</p>
            <p className="text-(--text-secondary)">
              Each can be used once if you lose your authenticator. They won&apos;t be shown again.
            </p>
            <ul className="grid grid-cols-2 gap-1 rounded bg-(--surface-2) p-2 font-mono text-(--text-primary)">
              {backupCodes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <Button variant="secondary" onClick={reset}>
              Done
            </Button>
          </div>
        )}

        {/* Idle: enable, or disable (with a code). */}
        {mode === 'idle' && !enabled && (
          <Button onClick={begin} disabled={busy}>
            {busy ? 'Starting…' : 'Enable two-factor authentication'}
          </Button>
        )}
        {mode === 'idle' && enabled && requiredByCompany && (
          <p className="text-(--text-secondary)">
            Your company requires two-factor authentication for all sign-ins, so it can&apos;t be turned off here.
          </p>
        )}
        {mode === 'idle' && enabled && !requiredByCompany && (
          <div className="space-y-2">
            <p className="text-(--text-secondary)">To turn off, enter a current code or a backup code:</p>
            <Input inputMode="numeric" placeholder="123456 or backup code" value={code} onChange={(e) => setCode(e.target.value)} />
            <Button variant="destructive" onClick={turnOff} disabled={busy || code.trim().length < 6}>
              {busy ? 'Disabling…' : 'Disable'}
            </Button>
          </div>
        )}

        {error && <p className="text-danger-500">{error}</p>}
      </CardContent>
    </Card>
  );
}
