import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSecuritySettings, updateSecuritySettings } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { describeApiError } from '@/lib/errors';

const KEY = ['security-settings'];

/**
 * Company-wide MFA-required / password-expiry policy (Auth/Billing Platform
 * Phase 3) — evaluated at login (AuthService.finishLoginForMembership), not
 * enforced client-side; this tab only edits the policy the backend checks.
 */
export function SecuritySettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: KEY, queryFn: getSecuritySettings });
  const [expiryDraft, setExpiryDraft] = useState('');

  const mutation = useMutation({
    mutationFn: updateSecuritySettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(KEY, settings);
      toast({ title: 'Security settings saved', variant: 'success' });
    },
    onError: (e) => toast({ title: 'Could not save', description: describeApiError(e), variant: 'destructive' }),
  });

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }
  if (isError || !data) {
    return <ErrorState message={describeApiError(error)} onRetry={() => refetch()} />;
  }

  const expiryEnabled = data.passwordExpiryDays !== null;

  return (
    <div className="max-w-lg space-y-6">
      <section className="space-y-2 rounded-xl border border-(--border-subtle) bg-(--surface-0)/80 p-4 elevation-1">
        <label className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-(--text-primary)">Require two-factor authentication</p>
            <p className="text-sm text-(--text-tertiary)">
              Every user in this company must enable an authenticator app (or sign in with a passkey) before they can access FleetHQ.
            </p>
          </div>
          <Switch
            checked={data.mfaRequired}
            disabled={mutation.isPending}
            onCheckedChange={(v) => mutation.mutate({ mfaRequired: v })}
          />
        </label>
      </section>

      <section className="space-y-3 rounded-xl border border-(--border-subtle) bg-(--surface-0)/80 p-4 elevation-1">
        <label className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-(--text-primary)">Require periodic password changes</p>
            <p className="text-sm text-(--text-tertiary)">Users are prompted to set a new password once theirs reaches this age.</p>
          </div>
          <Switch
            checked={expiryEnabled}
            disabled={mutation.isPending}
            onCheckedChange={(v) => mutation.mutate({ passwordExpiryDays: v ? 90 : null })}
          />
        </label>
        {expiryEnabled && (
          <div className="flex items-center gap-2">
            <Label htmlFor="password-expiry-days" className="shrink-0">Expire after</Label>
            <Input
              id="password-expiry-days"
              type="number"
              min={7}
              max={365}
              className="w-24"
              value={expiryDraft || String(data.passwordExpiryDays)}
              onChange={(e) => setExpiryDraft(e.target.value)}
              onBlur={() => {
                const days = Number(expiryDraft);
                setExpiryDraft('');
                if (expiryDraft && days >= 7 && days <= 365 && days !== data.passwordExpiryDays) {
                  mutation.mutate({ passwordExpiryDays: days });
                }
              }}
            />
            <span className="text-sm text-(--text-tertiary)">days (7–365)</span>
          </div>
        )}
      </section>

      {data.isDefault && (
        <p className="text-xs text-(--text-tertiary)">This company hasn&apos;t set its own policy yet — platform defaults apply (no requirements).</p>
      )}

      <Button variant="secondary" size="sm" disabled={mutation.isPending} onClick={() => refetch()}>
        Refresh
      </Button>
    </div>
  );
}
