import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { requestPasswordReset, resendVerification, resetPassword, verifyEmail } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

function Shell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-(--surface-1) p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex-col items-start gap-1">
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}

/** Request a reset link. Always reports success — the API never reveals whether the account exists. */
export function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await requestPasswordReset(identifier.trim());
    } finally {
      setBusy(false);
      setSent(true);
    }
  }

  return (
    <Shell title="Reset your password" description="Enter your username or email and we'll send a reset link.">
      {sent ? (
        <div className="space-y-4">
          <p className="text-sm text-(--text-secondary)">
            If an account matches, a reset link is on its way. Check your email and follow the link to choose a new password.
          </p>
          <Link to="/login" className="text-sm font-medium text-accent-600">← Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Input autoFocus placeholder="Username or email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          <Button type="submit" className="w-full" disabled={busy || !identifier.trim()}>
            {busy ? 'Sending…' : 'Send reset link'}
          </Button>
          <Link to="/login" className="block text-center text-sm text-(--text-tertiary)">Back to sign in</Link>
        </form>
      )}
    </Shell>
  );
}

/** Set a new password from a reset/invite link (?token=...). */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const isInvite = params.get('invite') === '1';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 1800);
    } catch {
      setError('This link is invalid or has expired. Request a new one.');
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <Shell title="Invalid link" description="This link is missing its token.">
        <Link to="/login" className="text-sm font-medium text-accent-600">← Back to sign in</Link>
      </Shell>
    );
  }

  return (
    <Shell
      title={isInvite ? 'Set your password' : 'Choose a new password'}
      description={isInvite ? 'Welcome — set a password to activate your login.' : 'Enter a new password for your account.'}
    >
      {done ? (
        <p className="text-sm text-success-600">Password set. Taking you to sign in…</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Input type="password" autoComplete="new-password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Input type="password" autoComplete="new-password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {error && <p className="text-sm text-danger-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Saving…' : 'Save password'}
          </Button>
        </form>
      )}
    </Shell>
  );
}

/** Confirm an email from a verification link (?token=...). */
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<'working' | 'ok' | 'error'>('working');
  const [identifier, setIdentifier] = useState('');
  const [resendBusy, setResendBusy] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!token) {
      setState('error');
      return;
    }
    verifyEmail(token)
      .then(() => setState('ok'))
      .catch(() => setState('error'));
  }, [token]);

  async function resend(e: React.FormEvent) {
    e.preventDefault();
    setResendBusy(true);
    try {
      await resendVerification(identifier.trim());
    } finally {
      setResendBusy(false);
      setResent(true);
    }
  }

  return (
    <Shell
      title="Email verification"
      description={state === 'working' ? 'Confirming your email…' : state === 'ok' ? 'All set.' : "That link didn't work."}
    >
      {state === 'ok' && <p className="text-sm text-success-600">Your email is verified. You can close this tab or sign in.</p>}
      {state === 'error' &&
        (resent ? (
          <p className="text-sm text-(--text-secondary)">
            If an account matches, a fresh verification link is on its way. Check your email and follow the new link.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-(--text-secondary)">
              This verification link is invalid or has expired. Enter your username or email and we'll send a fresh one.
            </p>
            <form onSubmit={resend} className="space-y-3">
              <Input autoFocus placeholder="Username or email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
              <Button type="submit" className="w-full" disabled={resendBusy || !identifier.trim()}>
                {resendBusy ? 'Sending…' : 'Send a new link'}
              </Button>
            </form>
          </div>
        ))}
      <Link to="/login" className="mt-4 block text-sm font-medium text-accent-600">→ Go to sign in</Link>
    </Shell>
  );
}
