import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorState } from '@/components/ui/EmptyState';
import { requestPasswordReset, resetPassword } from '@/api/auth';
import { ApiClientError } from '@/api/client';

function Shell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold">FleetHQ Admin</h1>
        <p className="mb-8 text-sm text-(--text-secondary)">{description}</p>
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

/**
 * The neutral confirmation shown after a reset request. It is intentionally the
 * SAME copy whether the identifier matched an account or not (and even when the
 * request never reached the server) — the view must not reveal account state.
 */
const NEUTRAL_CONFIRMATION = "If an account matches, we've emailed a reset link to the address on file.";

/**
 * Request a reset link. Non-enumerating: on submit we always land on the same
 * neutral confirmation regardless of the API response, and a network failure
 * only asks the admin to retry — it never discloses whether the account exists.
 */
export function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState(false);
  const [retry, setRetry] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setRetry(false);
    try {
      await requestPasswordReset(identifier.trim());
      setSent(true);
    } catch (err) {
      // status 0 = the request never reached the server (see ApiClientError).
      // A genuine network failure earns a retry prompt; any actual server
      // response is treated as success so we never branch on account state.
      if (err instanceof ApiClientError && err.status === 0) {
        setRetry(true);
      } else {
        setSent(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Reset your password" description="Enter your username or email and we'll send a reset link.">
      {sent ? (
        <div className="space-y-4">
          <p className="text-sm text-(--text-secondary)">{NEUTRAL_CONFIRMATION}</p>
          <Link to="/login" className="block text-sm font-medium text-accent-500">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <Input
            autoFocus
            placeholder="Username or email"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <Button type="submit" className="w-full" disabled={busy || !identifier.trim()}>
            {busy ? 'Sending…' : 'Send reset link'}
          </Button>
          {retry && (
            <ErrorState message="We couldn't reach the server. Check your connection and try again." />
          )}
          <Link to="/login" className="block text-center text-sm text-(--text-tertiary)">
            Back to sign in
          </Link>
        </form>
      )}
    </Shell>
  );
}

/** ≥8 chars AND at least 2 of: lowercase, uppercase, digit, symbol. */
function passwordMeetsPolicy(value: string): boolean {
  if (value.length < 8) return false;
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) => re.test(value)).length;
  return classes >= 2;
}

/** Map a reset-password failure to friendly, code-driven copy. */
function resetErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    switch (err.code) {
      case 'INVALID_TOKEN':
        return 'This reset link is invalid or has expired. Request a new one.';
      case 'WEAK_PASSWORD':
        return 'That password is too weak. Use at least 8 characters and mix upper and lower case, numbers, or symbols.';
      case 'PASSWORD_REUSED':
        return "You can't reuse a previous password. Please choose a new one.";
    }
  }
  return 'Could not reset your password. Check your connection and try again.';
}

/** Choose a new password from the emailed reset link (?token=...). */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <Shell title="Invalid reset link" description="This link is missing its reset token.">
        <div className="space-y-4">
          <ErrorState message="This reset link is invalid or has expired. Request a new one." />
          <Link to="/forgot-password" className="block text-sm font-medium text-accent-500">
            Request a new reset link
          </Link>
        </div>
      </Shell>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!passwordMeetsPolicy(password)) {
      setError('Use at least 8 characters and mix at least two of: upper case, lower case, numbers, symbols.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch (err) {
      setError(resetErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Choose a new password" description="Enter a new password for your admin account.">
      {done ? (
        <p className="text-sm font-medium text-accent-500">Password updated. Taking you to sign in…</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <p className="text-xs text-(--text-tertiary)">
            At least 8 characters, mixing at least two of: upper case, lower case, numbers, symbols.
          </p>
          {error && <ErrorState message={error} />}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Saving…' : 'Save new password'}
          </Button>
          <Link to="/login" className="block text-center text-sm text-(--text-tertiary)">
            Back to sign in
          </Link>
        </form>
      )}
    </Shell>
  );
}
