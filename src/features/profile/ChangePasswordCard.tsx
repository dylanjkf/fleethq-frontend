import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ApiClientError } from '@/api/client';
import { changePassword } from '@/api/auth';

/**
 * Self-service password change while already signed in — requires the
 * current password (Auth/Billing Platform Phase 3's other password-change
 * path, `changeExpiredPassword`, is the equivalent flow for a login blocked
 * by a company's password-expiry policy, on LoginPage rather than here).
 */
export function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (newPassword.length < 8) return setError('Use at least 8 characters.');
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');
    setBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not update your password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader className="flex-col items-start gap-1">
        <CardTitle>Password</CardTitle>
        <CardDescription>Change the password you sign in with.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && <p className="text-sm text-danger-500">{error}</p>}
          {done && <p className="text-sm text-success-600">Password updated.</p>}
          <Button type="submit" disabled={busy || !currentPassword || !newPassword}>
            {busy ? 'Saving…' : 'Update password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
