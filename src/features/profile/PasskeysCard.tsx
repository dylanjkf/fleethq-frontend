import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { startRegistration } from '@simplewebauthn/browser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { ApiClientError } from '@/api/client';
import { describeApiError } from '@/lib/errors';
import * as authApi from '@/api/auth';

/**
 * Self-service passkey (WebAuthn) enrolment. A passkey is deliberately
 * treated by the backend as already satisfying MFA on its own — see
 * AuthService.completeWebauthnLogin's doc comment — so enrolling one is a
 * meaningful step even for accounts that also have TOTP enabled.
 */
export function PasskeysCard() {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const query = useQuery({ queryKey: ['auth-passkeys'], queryFn: authApi.listPasskeys });
  const removeMutation = useMutation({
    mutationFn: (id: string) => authApi.removePasskey(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['auth-passkeys'] }),
  });

  async function addPasskey() {
    setError(null);
    setBusy(true);
    try {
      const { options, challengeToken } = await authApi.beginWebauthnRegistration();
      const response = await startRegistration({ optionsJSON: options });
      await authApi.verifyWebauthnRegistration(challengeToken, response, label.trim() || undefined);
      setLabel('');
      await queryClient.invalidateQueries({ queryKey: ['auth-passkeys'] });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not add that passkey.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader className="flex-col items-start gap-1">
        <CardTitle>Passkeys</CardTitle>
        <CardDescription>Sign in without a password using your device's built-in security key, fingerprint, or face.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {query.isLoading ? (
          <p className="text-sm text-(--text-tertiary)">Loading…</p>
        ) : query.isError ? (
          <ErrorState
            title="Couldn't load passkeys"
            message={describeApiError(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : !query.data?.length ? (
          <p className="text-sm text-(--text-tertiary)">No passkeys yet.</p>
        ) : (
          <Table>
            <TableBody>
              {query.data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-medium">{p.deviceLabel ?? 'Passkey'}</p>
                    <p className="text-xs text-(--text-tertiary)">
                      Added {new Date(p.createdAt).toLocaleDateString()}
                      {p.lastUsedAt && <> · last used {new Date(p.lastUsedAt).toLocaleString()}</>}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => removeMutation.mutate(p.id)} disabled={removeMutation.isPending}>
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="flex gap-2">
          <Input placeholder="Label this device (optional)" value={label} onChange={(e) => setLabel(e.target.value)} disabled={busy} />
          <Button onClick={addPasskey} disabled={busy}>
            {busy ? 'Waiting…' : 'Add a passkey'}
          </Button>
        </div>
        {error && <p className="text-sm text-danger-500">{error}</p>}
      </CardContent>
    </Card>
  );
}
