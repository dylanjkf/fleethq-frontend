import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Plus, Webhook as WebhookIcon } from 'lucide-react';
import {
  archiveWebhook,
  createWebhook,
  inboundWebhookUrl,
  listWebhookDeliveries,
  listWebhooks,
  testWebhook,
  updateWebhook,
  type CreateWebhookInput,
  type IntegrationWebhook,
} from '@/api/integrations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { WebhookFormDialog } from '@/features/integrations/WebhookFormDialog';
import { useToast } from '@/hooks/use-toast';
import { describeApiError } from '@/lib/errors';

const KEY = ['integrations', 'webhooks'];

/** Webhook Manager: incoming (shows the receive URL) and outgoing (posts to a target URL) — create/edit/test/deliveries log. */
export function WebhooksTab({ canManage }: { canManage: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IntegrationWebhook | undefined>();
  const [archiving, setArchiving] = useState<IntegrationWebhook | undefined>();
  const [deliveriesFor, setDeliveriesFor] = useState<IntegrationWebhook | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: KEY, queryFn: () => listWebhooks() });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

  const createM = useMutation({
    mutationFn: (v: CreateWebhookInput) => createWebhook(v),
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
      toast({ title: 'Webhook created', variant: 'success' });
    },
    onError: (e) => toast({ title: 'Could not create webhook', description: describeApiError(e), variant: 'destructive' }),
  });
  const updateM = useMutation({
    mutationFn: ({ id, v }: { id: string; v: CreateWebhookInput }) => updateWebhook(id, v),
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
      toast({ title: 'Webhook updated', variant: 'success' });
    },
    onError: (e) => toast({ title: 'Could not update webhook', description: describeApiError(e), variant: 'destructive' }),
  });
  const archiveM = useMutation({
    mutationFn: archiveWebhook,
    onSuccess: () => {
      invalidate();
      setArchiving(undefined);
      toast({ title: 'Webhook archived', variant: 'success' });
    },
    onError: (e) => toast({ title: 'Could not archive webhook', description: describeApiError(e), variant: 'destructive' }),
  });
  const testM = useMutation({
    mutationFn: testWebhook,
    onSuccess: (result) => {
      if (result.mode === 'outgoing') {
        toast({ title: result.success ? 'Test delivery sent' : 'Test delivery failed', description: `${result.attempts} attempt(s).`, variant: result.success ? 'success' : 'destructive' });
      } else {
        toast({ title: 'Inbound URL', description: result.inboundToken ? inboundWebhookUrl(result.inboundToken) : 'No token generated.' });
      }
    },
    onError: (e) => toast({ title: 'Test failed', description: describeApiError(e), variant: 'destructive' }),
  });

  async function copyInboundUrl(webhook: IntegrationWebhook) {
    if (!webhook.inboundToken) return;
    await navigator.clipboard.writeText(inboundWebhookUrl(webhook.inboundToken));
    toast({ title: 'Copied inbound URL', variant: 'success' });
  }

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-(--text-tertiary)">Incoming receivers and outgoing event notifiers.</p>
        {canManage && (
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New webhook
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
        <EmptyState icon={WebhookIcon} title="No webhooks yet" description={canManage ? 'Set up an inbound receiver or an outgoing notifier.' : 'Webhooks set up by your team appear here.'} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="font-medium text-(--text-primary)">{w.name}</TableCell>
                <TableCell>
                  <Badge variant={w.direction === 'INCOMING' ? 'accent' : 'neutral'}>{w.direction}</Badge>
                </TableCell>
                <TableCell className="max-w-[240px] truncate text-(--text-tertiary)">
                  {w.direction === 'INCOMING' ? (
                    w.inboundToken && (
                      <button type="button" className="inline-flex items-center gap-1 hover:text-accent-600" onClick={() => copyInboundUrl(w)}>
                        <Copy className="h-3 w-3" /> Copy URL
                      </button>
                    )
                  ) : (
                    w.targetUrl
                  )}
                </TableCell>
                <TableCell>{w.archivedAt ? <Badge variant="neutral">Archived</Badge> : w.isEnabled ? <Badge variant="success">Enabled</Badge> : <Badge variant="neutral">Disabled</Badge>}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setDeliveriesFor(w)}>
                      Deliveries
                    </Button>
                    <Button variant="ghost" size="sm" disabled={testM.isPending} onClick={() => testM.mutate(w.id)}>
                      Test
                    </Button>
                    {canManage && !w.archivedAt && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(w);
                            setFormOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setArchiving(w)}>
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

      <WebhookFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        webhook={editing}
        isSubmitting={createM.isPending || updateM.isPending}
        onSubmit={async (v) => {
          if (editing) await updateM.mutateAsync({ id: editing.id, v });
          else await createM.mutateAsync(v);
        }}
      />
      <DeliveriesDrawer webhook={deliveriesFor} onOpenChange={(o) => !o && setDeliveriesFor(null)} />
      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(o) => !o && setArchiving(undefined)}
        title="Archive this webhook?"
        description={`"${archiving?.name ?? ''}" will stop receiving/sending deliveries.`}
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archiving && archiveM.mutate(archiving.id)}
        isConfirming={archiveM.isPending}
      />
    </div>
  );
}

function DeliveriesDrawer({ webhook, onOpenChange }: { webhook: IntegrationWebhook | null; onOpenChange: (open: boolean) => void }) {
  const deliveriesQuery = useQuery({
    queryKey: ['integrations', 'webhook-deliveries', webhook?.id],
    queryFn: () => listWebhookDeliveries(webhook!.id),
    enabled: !!webhook,
  });

  return (
    <Drawer open={!!webhook} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-lg overflow-y-auto">
        <DrawerHeader>
          <DrawerTitle>{webhook?.name} — deliveries</DrawerTitle>
        </DrawerHeader>
        {deliveriesQuery.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (deliveriesQuery.data?.items.length ?? 0) === 0 ? (
          <p className="py-4 text-center text-sm text-(--text-tertiary)">No deliveries yet.</p>
        ) : (
          <ul className="space-y-2">
            {deliveriesQuery.data!.items.map((d) => (
              <li key={d.id} className="rounded-lg border border-(--border-subtle) p-3">
                <div className="flex items-center justify-between">
                  <Badge variant={d.success ? 'success' : 'danger'}>{d.success ? 'Success' : 'Failed'}</Badge>
                  <span className="text-xs text-(--text-tertiary)">{new Date(d.createdAt).toLocaleString()}</span>
                </div>
                <div className="mt-1 text-xs text-(--text-tertiary)">
                  Attempt {d.attempt}
                  {d.responseStatus != null && ` · HTTP ${d.responseStatus}`}
                </div>
                {d.errorMessage && <p className="mt-1 text-sm text-danger-500">{d.errorMessage}</p>}
              </li>
            ))}
          </ul>
        )}
      </DrawerContent>
    </Drawer>
  );
}
