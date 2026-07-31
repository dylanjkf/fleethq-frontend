import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import * as authApi from '@/api/auth';

/** Self-service device/session management — mirrors the FleetHQ admin platform's own SessionsCard. */
export function SessionsCard() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['auth-sessions'], queryFn: authApi.listSessions });
  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => authApi.revokeSession(sessionId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['auth-sessions'] }),
  });

  return (
    <Card className="max-w-lg">
      <CardHeader className="flex-col items-start gap-1">
        <CardTitle>Active sessions</CardTitle>
        <CardDescription>Devices and browsers currently signed in to your account.</CardDescription>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <p className="text-sm text-(--text-tertiary)">Loading…</p>
        ) : !query.data?.length ? (
          <p className="text-sm text-(--text-tertiary)">No active sessions.</p>
        ) : (
          <Table>
            <TableBody>
              {query.data.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <p className="font-medium">{s.deviceLabel ?? s.userAgent ?? 'Unknown device'}</p>
                    <p className="text-xs text-(--text-tertiary)">
                      {s.ipAddress} · last seen {new Date(s.lastSeenAt).toLocaleString()}
                    </p>
                  </TableCell>
                  <TableCell>{s.isCurrent && <Badge variant="accent">This device</Badge>}</TableCell>
                  <TableCell className="text-right">
                    {!s.isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeMutation.mutate(s.id)}
                        disabled={revokeMutation.isPending}
                      >
                        Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
