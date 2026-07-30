import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Plus } from 'lucide-react';
import {
  archiveCredential,
  createCredential,
  listCredentials,
  testCredential,
  updateCredential,
  type CreateCredentialInput,
  type IntegrationCredential,
} from '@/api/integrations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CredentialFormDialog } from '@/features/integrations/CredentialFormDialog';
import { useToast } from '@/hooks/use-toast';
import { describeApiError } from '@/lib/errors';

const KEY = ['integrations', 'credentials'];

const AUTH_TYPE_LABEL: Record<string, string> = {
  NONE: 'None',
  API_KEY: 'API key',
  BEARER_TOKEN: 'Bearer token',
  BASIC_AUTH: 'Basic auth',
  WEBHOOK_SECRET: 'Webhook secret',
};

/** Credential Manager — the vault. Never displays a secret; "configured" is all a viewer ever sees. */
export function CredentialsTab({ canManage }: { canManage: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IntegrationCredential | undefined>();
  const [archiving, setArchiving] = useState<IntegrationCredential | undefined>();

  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: KEY, queryFn: () => listCredentials() });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

  const createM = useMutation({
    mutationFn: (v: CreateCredentialInput) => createCredential(v),
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
      toast({ title: 'Credential saved', variant: 'success' });
    },
    onError: (e) => toast({ title: 'Could not save credential', description: describeApiError(e), variant: 'destructive' }),
  });
  const updateM = useMutation({
    mutationFn: ({ id, v }: { id: string; v: CreateCredentialInput }) => updateCredential(id, v),
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
      toast({ title: 'Credential updated', variant: 'success' });
    },
    onError: (e) => toast({ title: 'Could not update credential', description: describeApiError(e), variant: 'destructive' }),
  });
  const archiveM = useMutation({
    mutationFn: archiveCredential,
    onSuccess: () => {
      invalidate();
      setArchiving(undefined);
      toast({ title: 'Credential archived', variant: 'success' });
    },
    onError: (e) => toast({ title: 'Could not archive', description: describeApiError(e), variant: 'destructive' }),
  });
  const testM = useMutation({
    mutationFn: testCredential,
    onSuccess: (result) => toast({ title: result.ok ? 'Credential OK' : 'Credential problem', description: result.message, variant: result.ok ? 'success' : 'destructive' }),
    onError: (e) => toast({ title: 'Could not test credential', description: describeApiError(e), variant: 'destructive' }),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-(--text-tertiary)">Secrets are encrypted at rest and never shown again once saved.</p>
        {canManage && (
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New credential
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={describeApiError(error)} onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={KeyRound} title="No credentials yet" description={canManage ? 'Store an API key, token, or webhook signing secret to use in a connection.' : 'Credentials added by your team appear here.'} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Auth type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium text-(--text-primary)">{c.name}</TableCell>
                <TableCell>{AUTH_TYPE_LABEL[c.authType] ?? c.authType}</TableCell>
                <TableCell>{c.archivedAt ? <Badge variant="neutral">Archived</Badge> : <Badge variant="success">Configured</Badge>}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" disabled={testM.isPending} onClick={() => testM.mutate(c.id)}>
                      Test
                    </Button>
                    {canManage && !c.archivedAt && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(c);
                            setFormOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setArchiving(c)}>
                          Archive
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CredentialFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        credential={editing}
        isSubmitting={createM.isPending || updateM.isPending}
        onSubmit={async (v) => {
          if (editing) await updateM.mutateAsync({ id: editing.id, v });
          else await createM.mutateAsync(v);
        }}
      />
      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(o) => !o && setArchiving(undefined)}
        title="Archive this credential?"
        description={`"${archiving?.name ?? ''}" will stop being usable by any connection or webhook that references it.`}
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archiving && archiveM.mutate(archiving.id)}
        isConfirming={archiveM.isPending}
      />
    </div>
  );
}
