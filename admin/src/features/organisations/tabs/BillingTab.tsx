import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as billingApi from '@/api/billing';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ApiClientError } from '@/api/client';
import { useToast } from '@/hooks/useToast';

function errorMessage(error: unknown): string {
  return error instanceof ApiClientError ? error.message : 'That billing action failed.';
}

function InvoicesCard({ companyId }: { companyId: string }) {
  const invoicesQuery = useQuery({ queryKey: ['billing-invoices', companyId], queryFn: () => billingApi.listInvoices(companyId, 20) });
  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold">Invoices</h2>
      </CardHeader>
      {invoicesQuery.data?.items.length ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-(--border-subtle) text-left text-xs uppercase tracking-wide text-(--text-tertiary)">
              <th className="px-5 py-2 font-medium">Number</th>
              <th className="px-5 py-2 font-medium">Status</th>
              <th className="px-5 py-2 font-medium">Amount due</th>
              <th className="px-5 py-2 font-medium">Created</th>
              <th className="px-5 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {invoicesQuery.data.items.map((inv) => (
              <tr key={inv.id} className="border-b border-(--border-subtle) last:border-0">
                <td className="px-5 py-2">{inv.number ?? inv.id}</td>
                <td className="px-5 py-2">{inv.status}</td>
                <td className="px-5 py-2">
                  {(inv.amountDue / 100).toFixed(2)} {inv.currency.toUpperCase()}
                </td>
                <td className="px-5 py-2 text-(--text-secondary)">{new Date(inv.created).toLocaleDateString()}</td>
                <td className="px-5 py-2 text-right">
                  {inv.hostedInvoiceUrl && (
                    <a href={inv.hostedInvoiceUrl} target="_blank" rel="noreferrer" className="text-accent-400 hover:underline">
                      View
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="px-5 py-4 text-sm text-(--text-tertiary)">No invoices.</p>
      )}
    </Card>
  );
}

type ActionKind = 'refund' | 'coupon' | 'manual' | 'credit';

/**
 * The financial-action forms. Each is routed through a confirmation dialog and
 * a mutation, so errors surface via the global MutationCache toast (App.tsx),
 * successes via a per-mutation toast, and any failure also shows inline.
 */
function BillingActionForms({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [refundInvoiceId, setRefundInvoiceId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [couponId, setCouponId] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [creditInvoiceId, setCreditInvoiceId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [retryInvoiceId, setRetryInvoiceId] = useState('');
  const [confirm, setConfirm] = useState<ActionKind | null>(null);

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['billing-status', companyId] });
    void queryClient.invalidateQueries({ queryKey: ['billing-invoices', companyId] });
  }

  function onDone(message: string, reset: () => void) {
    invalidate();
    toast.success(message);
    reset();
  }

  const refundMutation = useMutation({
    mutationFn: () => billingApi.refundInvoice(companyId, refundInvoiceId, refundAmount ? Number(refundAmount) : undefined),
    onSuccess: () => onDone('Refund issued.', () => { setRefundInvoiceId(''); setRefundAmount(''); }),
  });
  const couponMutation = useMutation({
    mutationFn: () => billingApi.applyCoupon(companyId, couponId),
    onSuccess: () => onDone('Coupon applied.', () => setCouponId('')),
  });
  const manualInvoiceMutation = useMutation({
    mutationFn: () => billingApi.createManualInvoice(companyId, manualDesc, Number(manualAmount)),
    onSuccess: () => onDone('Manual invoice created.', () => { setManualDesc(''); setManualAmount(''); }),
  });
  const creditNoteMutation = useMutation({
    mutationFn: () => billingApi.issueCreditNote(companyId, creditInvoiceId, Number(creditAmount)),
    onSuccess: () => onDone('Credit note issued.', () => { setCreditInvoiceId(''); setCreditAmount(''); }),
  });
  const retryMutation = useMutation({
    mutationFn: () => billingApi.retryPayment(companyId, retryInvoiceId),
    onSuccess: () => onDone('Payment retry started.', () => setRetryInvoiceId('')),
  });

  const activeError = [refundMutation, couponMutation, manualInvoiceMutation, creditNoteMutation, retryMutation].find((m) => m.isError)?.error;

  const config: Record<ActionKind, { title: string; description: string; confirmLabel: string; run: () => Promise<void> }> = {
    refund: {
      title: 'Issue refund',
      description: `Refunds ${refundAmount ? `${refundAmount} (minor units)` : 'the full amount'} on invoice ${refundInvoiceId}. This moves real money and cannot be undone here.`,
      confirmLabel: 'Issue refund',
      run: () => refundMutation.mutateAsync(),
    },
    coupon: {
      title: 'Apply coupon',
      description: `Applies coupon ${couponId} to this customer's Stripe subscription, changing what they are charged.`,
      confirmLabel: 'Apply coupon',
      run: () => couponMutation.mutateAsync(),
    },
    manual: {
      title: 'Create manual invoice',
      description: `Creates and charges a manual invoice for "${manualDesc}" of ${manualAmount} (minor units). This bills the customer.`,
      confirmLabel: 'Create invoice',
      run: () => manualInvoiceMutation.mutateAsync(),
    },
    credit: {
      title: 'Issue credit note',
      description: `Issues a credit note of ${creditAmount} (minor units) against invoice ${creditInvoiceId}. This reduces what the customer owes.`,
      confirmLabel: 'Issue credit note',
      run: () => creditNoteMutation.mutateAsync(),
    },
  };

  return (
    <>
      {activeError && <ErrorState message={errorMessage(activeError)} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Refund</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            <Input placeholder="Invoice ID" value={refundInvoiceId} onChange={(e) => setRefundInvoiceId(e.target.value)} />
            <Input placeholder="Amount in cents (blank = full)" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
            <Button size="sm" disabled={!refundInvoiceId || refundMutation.isPending} onClick={() => setConfirm('refund')}>
              Issue refund
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Apply coupon</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            <Input placeholder="Stripe coupon ID" value={couponId} onChange={(e) => setCouponId(e.target.value)} />
            <Button size="sm" disabled={!couponId || couponMutation.isPending} onClick={() => setConfirm('coupon')}>
              Apply
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Manual invoice</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            <Input placeholder="Description" value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} />
            <Input placeholder="Amount in cents" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} />
            <Button size="sm" disabled={!manualDesc || !manualAmount || manualInvoiceMutation.isPending} onClick={() => setConfirm('manual')}>
              Create invoice
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Credit note</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            <Input placeholder="Invoice ID" value={creditInvoiceId} onChange={(e) => setCreditInvoiceId(e.target.value)} />
            <Input placeholder="Amount in cents" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} />
            <Button size="sm" disabled={!creditInvoiceId || !creditAmount || creditNoteMutation.isPending} onClick={() => setConfirm('credit')}>
              Issue credit note
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Retry payment</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            <Input placeholder="Invoice ID" value={retryInvoiceId} onChange={(e) => setRetryInvoiceId(e.target.value)} />
            <Button size="sm" disabled={!retryInvoiceId || retryMutation.isPending} onClick={() => retryMutation.mutate()}>
              Retry
            </Button>
          </CardBody>
        </Card>
      </div>

      {confirm && (
        <ConfirmDialog
          title={config[confirm].title}
          description={config[confirm].description}
          confirmLabel={config[confirm].confirmLabel}
          danger
          onConfirm={async () => {
            await config[confirm].run();
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}

export function BillingTab({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const statusQuery = useQuery({ queryKey: ['billing-status', companyId], queryFn: () => billingApi.getBillingStatus(companyId) });
  const [confirmCancel, setConfirmCancel] = useState<'periodEnd' | 'immediate' | null>(null);

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['billing-status', companyId] });
    void queryClient.invalidateQueries({ queryKey: ['billing-invoices', companyId] });
  }

  const cancelMutation = useMutation({
    mutationFn: (atPeriodEnd: boolean) => billingApi.cancelSubscription(companyId, atPeriodEnd),
    onSuccess: (_data, atPeriodEnd) => {
      invalidate();
      toast.success(atPeriodEnd ? 'Cancellation scheduled for period end.' : 'Subscription cancelled.');
    },
  });
  const reinstateMutation = useMutation({
    mutationFn: () => billingApi.reinstateSubscription(companyId),
    onSuccess: () => {
      invalidate();
      toast.success('Subscription reinstated.');
    },
  });

  if (statusQuery.isLoading) return <PageSpinner />;
  if (statusQuery.isError) {
    return <ErrorState message={statusQuery.error instanceof ApiClientError ? statusQuery.error.message : 'Could not load billing status.'} />;
  }
  const status = statusQuery.data!;

  if (!status.billingConfigured) {
    return <ErrorState message="Billing is not configured on this deployment." />;
  }

  const cancelError = [cancelMutation, reinstateMutation].find((m) => m.isError)?.error;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Status</h2>
        </CardHeader>
        <CardBody className="space-y-2 text-sm">
          <p>
            Subscription: <Badge tone="accent">{status.subscriptionStatus}</Badge>
          </p>
          {status.stripe && (
            <>
              <p>Stripe status: {status.stripe.status}</p>
              <p>Current period ends: {new Date(status.stripe.currentPeriodEnd).toLocaleString()}</p>
              <p>Cancel at period end: {status.stripe.cancelAtPeriodEnd ? 'Yes' : 'No'}</p>
            </>
          )}
          {!status.hasStripeCustomer && <p className="text-(--text-tertiary)">No Stripe customer yet.</p>}
          {status.hasStripeSubscription && (
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setConfirmCancel('periodEnd')} disabled={cancelMutation.isPending}>
                Cancel at period end
              </Button>
              <Button variant="danger" size="sm" onClick={() => setConfirmCancel('immediate')} disabled={cancelMutation.isPending}>
                Cancel immediately
              </Button>
              {status.stripe?.cancelAtPeriodEnd && (
                <Button variant="secondary" size="sm" onClick={() => reinstateMutation.mutate()} disabled={reinstateMutation.isPending}>
                  Reinstate
                </Button>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {cancelError && <ErrorState message={errorMessage(cancelError)} />}

      <InvoicesCard companyId={companyId} />

      <BillingActionForms companyId={companyId} />

      {confirmCancel && (
        <ConfirmDialog
          title={confirmCancel === 'immediate' ? 'Cancel subscription immediately' : 'Cancel at period end'}
          description={
            confirmCancel === 'immediate'
              ? 'Ends the subscription right now. Any access tied to the subscription stops immediately — this cannot be undone here.'
              : 'Schedules cancellation at the end of the current billing period. The subscription stays active until then.'
          }
          confirmLabel={confirmCancel === 'immediate' ? 'Cancel now' : 'Schedule cancellation'}
          danger={confirmCancel === 'immediate'}
          onConfirm={async () => {
            await cancelMutation.mutateAsync(confirmCancel === 'immediate' ? false : true);
            setConfirmCancel(null);
          }}
          onCancel={() => setConfirmCancel(null)}
        />
      )}
    </div>
  );
}
