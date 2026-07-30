import { useQuery } from '@tanstack/react-query';
import { PackageCheck } from 'lucide-react';
import { getCustomerDeliveries, type CustomerDelivery } from '@/api/customers';
import { ApiClientError } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';

interface CustomerDeliveriesPanelProps {
  customerId?: string;
  customerName: string;
  onOpenChange: (open: boolean) => void;
}

const OUTCOME: Record<CustomerDelivery['outcome'], { label: string; variant: 'success' | 'danger' | 'neutral' }> = {
  DELIVERED: { label: 'Delivered', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'danger' },
  PENDING: { label: 'Pending', variant: 'neutral' },
};

/** A customer's logged past deliveries — every stop that referenced them, newest first, with outcome and proof. */
export function CustomerDeliveriesPanel({ customerId, customerName, onOpenChange }: CustomerDeliveriesPanelProps) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['customer-deliveries', customerId],
    queryFn: () => getCustomerDeliveries(customerId!),
    enabled: !!customerId,
  });

  return (
    <Drawer open={!!customerId} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Deliveries — {customerName}</DrawerTitle>
        </DrawerHeader>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState message={error instanceof ApiClientError ? error.message : 'Could not load deliveries.'} onRetry={() => refetch()} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon={PackageCheck} title="No deliveries yet" description="Once a delivery stop references this customer, it appears here with its outcome and proof of delivery." />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="success">{data.summary.delivered} delivered</Badge>
              <Badge variant="danger">{data.summary.failed} failed</Badge>
              <Badge variant="neutral">{data.summary.pending} pending</Badge>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto">
              {data.items.map((d) => {
                const o = OUTCOME[d.outcome];
                const when = d.completedAt ?? d.createdAt;
                return (
                  <div key={d.id} className="rounded-xl border border-(--border-subtle) bg-(--surface-0)/80 p-3">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="text-sm font-medium text-(--text-primary)">{d.label}</div>
                      <Badge variant={o.variant} className="shrink-0">{o.label}</Badge>
                    </div>
                    {d.address && <p className="text-xs text-(--text-tertiary)">{d.address}</p>}
                    <p className="mt-1 text-xs text-(--text-tertiary)" data-tabular>
                      {d.completedAt ? new Date(d.completedAt).toLocaleString() : `Created ${new Date(when).toLocaleDateString()}`}
                      {' · '}
                      <span className="opacity-80">{d.job.title}</span>
                    </p>
                    {d.outcome === 'DELIVERED' && d.recipientName && <p className="mt-1 text-xs text-(--text-tertiary)">Received by {d.recipientName}</p>}
                    {d.outcome === 'FAILED' && d.failureReason && <p className="mt-1 text-xs text-danger-500">{d.failureReason.replace(/_/g, ' ').toLowerCase()}</p>}
                    {(d.podAttachmentId || d.signatureAttachmentId) && (
                      <p className="mt-1 text-xs text-(--text-tertiary)">
                        {d.podAttachmentId && 'Photo POD'}
                        {d.podAttachmentId && d.signatureAttachmentId && ' · '}
                        {d.signatureAttachmentId && 'Signature'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
