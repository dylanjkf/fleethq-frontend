import { useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import * as authApi from '@/api/auth';
import { tokenStore } from '@/api/token-store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorState } from '@/components/ui/EmptyState';
import { ApiClientError } from '@/api/client';

/**
 * Blocking account-setup flow the server forces before it will honour any
 * permission. The admin-permission guard returns ADMIN_SETUP_REQUIRED (403)
 * until the signed-in admin has (a) changed the temporary password they were
 * bootstrapped with and (b) enrolled in MFA where the deployment enforces it,
 * so without this screen an obligated admin would hit a wall of 403s with no
 * way out (Round 3 High). `me.obligations` drives which step shows; each step
 * refreshes `me` on success, and the gate falls through to the app once both
 * obligations clear.
 */
export function AccountSetupGate({ children }: { children: ReactNode }) {
  const { admin } = useAuth();

  if (!admin) return <>{children}</>;
  const { passwordReset, mfaEnrollment } = admin.obligations;
  if (!passwordReset && !mfaEnrollment) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--surface-0) p-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-(--border-subtle) bg-(--surface-1) p-6 shadow-2xl">
        <div>
          <p className="text-sm font-bold tracking-tight">Finish setting up your account</p>
          <p className="mt-1 text-xs text-(--text-tertiary)">
            A couple of security steps are required before you can use the console.
          </p>
        </div>

        <ol className="flex items-center gap-2 text-xs">
          <StepPill label="Password" state={passwordReset ? 'active' : 'done'} />
          <span className="text-(--text-tertiary)">→</span>
          <StepPill label="Two-factor" state={passwordReset ? 'pending' : mfaEnrollment ? 'active' : 'done'} />
        </ol>

        {passwordReset ? <ChangePasswordStep /> : <MfaEnrollStep />}
      </div>
    </div>
  );
}

function StepPill({ label, state }: { label: string; state: 'done' | 'active' | 'pending' }) {
  const cls =
    state === 'active'
      ? 'bg-accent-500 text-white'
      : state === 'done'
        ? 'bg-success-500 text-black'
        : 'bg-(--surface-2) text-(--text-tertiary)';
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${cls}`}>{state === 'done' ? '✓ ' : ''}{label}</span>;
}

function ChangePasswordStep() {
  const { refreshMe } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirm) {
      setError('The new passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const { accessToken } = await authApi.changePassword(currentPassword, newPassword);
      // The change bumped tokenVersion server-side, invalidating the old token —
      // swap in the freshly minted one before we reload identity, or the very
      // next request would 401.
      tokenStore.set(accessToken);
      await refreshMe();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not change your password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Change your temporary password</h2>
        <p className="mt-1 text-xs text-(--text-tertiary)">
          At least 8 characters, combining at least two of: lowercase, uppercase, numbers, symbols.
        </p>
      </div>
      <label className="block text-sm">
        <span className="text-(--text-tertiary)">Current password</span>
        <Input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
      </label>
      <label className="block text-sm">
        <span className="text-(--text-tertiary)">New password</span>
        <Input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
      </label>
      <label className="block text-sm">
        <span className="text-(--text-tertiary)">Confirm new password</span>
        <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
      </label>
      {error && <ErrorState message={error} />}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Saving…' : 'Set new password'}
      </Button>
    </form>
  );
}

function MfaEnrollStep() {
  const { refreshMe, logout } = useAuth();
  const [enrolling, setEnrolling] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function begin() {
    setError(null);
    setBusy(true);
    try {
      setEnrolling(await authApi.setupMfa());
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not start MFA enrolment.');
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await authApi.enableMfa(code);
      setBackupCodes(result.backupCodes);
      setEnrolling(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not confirm that code.');
    } finally {
      setBusy(false);
    }
  }

  if (backupCodes) {
    return (
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Two-factor is on</h2>
          <p className="mt-1 text-xs text-(--text-tertiary)">Save these one-time backup codes somewhere safe — each works once if you lose your device.</p>
        </div>
        <ul className="grid grid-cols-2 gap-1 font-mono text-xs">
          {backupCodes.map((c) => (
            <li key={c} className="rounded bg-(--surface-2) px-2 py-1">
              {c}
            </li>
          ))}
        </ul>
        <Button className="w-full" onClick={() => void refreshMe()}>
          Continue to the console
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Set up two-factor authentication</h2>
        <p className="mt-1 text-xs text-(--text-tertiary)">This deployment requires MFA on every staff account.</p>
      </div>
      {enrolling ? (
        <form onSubmit={confirm} className="space-y-3">
          <p className="text-xs text-(--text-secondary)">Add this secret to your authenticator app (Google Authenticator, 1Password, Authy…), then enter the 6-digit code it shows:</p>
          <code className="block break-all rounded bg-(--surface-2) px-2 py-1 text-xs">{enrolling.secret}</code>
          <label className="block text-sm">
            <span className="text-(--text-tertiary)">6-digit code</span>
            <Input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required />
          </label>
          {error && <ErrorState message={error} />}
          <Button type="submit" className="w-full" disabled={busy || !code}>
            {busy ? 'Confirming…' : 'Confirm & enable'}
          </Button>
        </form>
      ) : (
        <>
          {error && <ErrorState message={error} />}
          <Button className="w-full" onClick={() => void begin()} disabled={busy}>
            {busy ? 'Starting…' : 'Begin MFA setup'}
          </Button>
        </>
      )}
      <button type="button" onClick={() => void logout()} className="w-full text-center text-xs text-(--text-tertiary) hover:text-(--text-secondary)">
        Sign out
      </button>
    </div>
  );
}
