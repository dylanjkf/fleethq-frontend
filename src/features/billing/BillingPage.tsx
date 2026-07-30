import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { AlertTriangle, Check, CreditCard, ExternalLink, Sparkles } from 'lucide-react';
import { getBillingStatus, createCheckoutSession, createPortalSession, getEntitlements, getPlans, type PlanOption } from '@/api/billing';
import type { SubscriptionStatus } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { useToast } from '@/hooks/use-toast';
import { describeApiError } from '@/lib/errors';

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  NONE: 'No active subscription',
  TRIALING: 'Trial',
  ACTIVE: 'Active',
  PAST_DUE: 'Payment overdue',
  CANCELED: 'Cancelled',
};

function statusVariant(status: SubscriptionStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'ACTIVE':
    case 'TRIALING':
      return 'success';
    case 'PAST_DUE':
      return 'warning';
    case 'CANCELED':
      return 'danger';
    default:
      return 'neutral';
  }
}

const FEATURE_LABEL: Record<string, string> = {
  core: 'Dispatch, drivers & workshop',
  forms: 'Universal forms & checklists',
  intelligence: 'Fleet Intelligence & predictions',
  warehouse: 'Warehouse add-on',
};

function limitLabel(n: number | null): string {
  return n == null ? 'Unlimited' : String(n);
}

/**
 * Billing (19-Billing/Billing_And_Subscriptions.md). Surfaces the company's
 * subscription/trial status, presents the purchasable plans, and routes payment
 * to Stripe's own hosted Checkout/Portal — FleetOS never handles card details.
 * Per "billing informs, never hard-locks out", nothing here blocks the product.
 */
export function BillingPage() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const canManage = can(PERMISSIONS.BILLING_MANAGE);
  const [redirecting, setRedirecting] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['billing-status'], queryFn: getBillingStatus });
  const { data: entitlements } = useQuery({ queryKey: ['billing-entitlements'], queryFn: getEntitlements });
  const { data: plansData } = useQuery({ queryKey: ['billing-plans'], queryFn: getPlans });

  async function goToCheckout(priceId: string | null) {
    if (!priceId) {
      toast({ title: 'This plan has no price configured yet — contact us to set it up.', variant: 'destructive' });
      return;
    }
    setRedirecting(true);
    try {
      const { url } = await createCheckoutSession(priceId);
      window.location.href = url;
    } catch (err) {
      setRedirecting(false);
      toast({ title: 'Could not start checkout', description: describeApiError(err), variant: 'destructive' });
    }
  }

  async function goToPortal() {
    setRedirecting(true);
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (err) {
      setRedirecting(false);
      toast({ title: 'Could not open the billing portal', description: describeApiError(err), variant: 'destructive' });
    }
  }

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>Billing &amp; subscription</PanelTitle>
          <PanelDescription>
            Manage your FleetOS subscription. Payments are handled securely by Stripe — FleetOS never sees your card
            details.
          </PanelDescription>
        </div>
        {data && <Badge variant={statusVariant(data.subscriptionStatus)}>{STATUS_LABEL[data.subscriptionStatus]}</Badge>}
      </PanelHeader>

      {entitlements?.trialActive && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-accent-500/40 bg-accent-500/10 p-4 text-sm">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />
          <div>
            <p className="font-medium text-(--text-primary)">
              You're on a free trial — {entitlements.trialDaysLeft} day{entitlements.trialDaysLeft === 1 ? '' : 's'} left
            </p>
            <p className="mt-0.5 text-(--text-secondary)">
              Every feature is unlocked during your trial. Choose a plan below to keep going after it ends.
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : isError ? (
        <ErrorState message={describeApiError(error)} onRetry={() => refetch()} />
      ) : (
        <div className="space-y-6">
          {data!.subscriptionStatus === 'PAST_DUE' && (
            <div className="flex items-start gap-2 rounded-md border border-warning-500/40 bg-warning-500/10 p-4 text-sm text-warning-500">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Your last payment didn't go through. Update your payment method to avoid any interruption.</span>
            </div>
          )}

          {!data!.billingConfigured ? (
            <div className="rounded-lg border border-(--border-subtle) bg-(--surface-2) p-6 text-sm text-(--text-secondary)">
              Online billing isn't set up on this deployment. Your account is managed directly — contact your FleetOS
              representative for any billing questions.
            </div>
          ) : (
            <>
              {/* Current subscription + portal */}
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-(--border-subtle) p-4">
                <div className="flex items-start gap-3">
                  <CreditCard className="mt-0.5 h-5 w-5 text-(--text-tertiary)" />
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-(--text-primary)">
                      {data!.subscriptionStatus !== 'NONE' ? 'You have a FleetOS subscription' : entitlements?.trialActive ? 'On free trial' : 'No active subscription'}
                    </p>
                    <p className="text-(--text-secondary)">
                      {data!.subscriptionStatus !== 'NONE'
                        ? 'Manage your plan, payment method, and invoices in the Stripe billing portal.'
                        : 'Pick a plan below to keep your fleet running on FleetOS.'}
                    </p>
                  </div>
                </div>
                {canManage && data!.hasStripeCustomer && (
                  <Button variant="secondary" onClick={goToPortal} disabled={redirecting}>
                    <ExternalLink className="mr-2 h-4 w-4" /> Manage billing
                  </Button>
                )}
              </div>

              {/* Plan picker */}
              {plansData && plansData.plans.length > 0 && (
                <div>
                  <p className="mb-3 text-sm font-medium text-(--text-secondary)">Choose a plan</p>
                  <div className="grid gap-4 md:grid-cols-3">
                    {plansData.plans.map((plan) => (
                      <PlanCard
                        key={plan.key}
                        plan={plan}
                        isCurrent={data!.subscriptionStatus === 'ACTIVE' && data!.planPriceId === plan.priceId}
                        canManage={canManage}
                        redirecting={redirecting}
                        onSubscribe={() => goToCheckout(plan.priceId)}
                      />
                    ))}
                  </div>
                  {!canManage && (
                    <p className="mt-3 text-sm text-(--text-tertiary)">
                      You don't have permission to change billing. Ask an administrator to manage the subscription.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Panel>
  );
}

function PlanCard({
  plan,
  isCurrent,
  canManage,
  redirecting,
  onSubscribe,
}: {
  plan: PlanOption;
  isCurrent: boolean;
  canManage: boolean;
  redirecting: boolean;
  onSubscribe: () => void;
}) {
  return (
    <div className={`flex flex-col rounded-(--radius-panel) border p-4 ${isCurrent ? 'border-accent-500/60 bg-accent-500/5' : 'border-(--border-subtle) bg-(--surface-1)'}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-(--text-primary)">{plan.name}</h3>
        {isCurrent && <Badge variant="accent">Current</Badge>}
      </div>
      <p className="mt-1 text-sm text-(--text-tertiary)">
        {limitLabel(plan.limits.maxAssets)} assets · {limitLabel(plan.limits.maxOperators)} operators
      </p>
      <ul className="mt-3 flex-1 space-y-1.5 text-sm text-(--text-secondary)">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-500" />
            {FEATURE_LABEL[f] ?? f}
          </li>
        ))}
      </ul>
      <Button
        className="mt-4 w-full"
        variant={isCurrent ? 'secondary' : 'primary'}
        disabled={!canManage || redirecting || isCurrent || !plan.purchasable}
        onClick={onSubscribe}
      >
        {isCurrent ? 'Current plan' : plan.purchasable ? `Choose ${plan.name}` : 'Contact us'}
      </Button>
    </div>
  );
}
