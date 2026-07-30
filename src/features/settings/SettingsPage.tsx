import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getNotificationPreferences, listNotificationTypes, updateNotificationPreferences, type NotificationPreferences } from '@/api/notifications';
import { ApiClientError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/cn';
import { useTheme, type Theme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/use-toast';
import { disablePushNotifications, enablePushNotifications, getPushSubscriptionState, isPushSupported, isSecureForPush } from '@/lib/push-registration';

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

const QUERY_KEY = ['notifications', 'preferences'];

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: QUERY_KEY, queryFn: getNotificationPreferences });
  const { data: notificationTypes } = useQuery({
    queryKey: ['notifications', 'types'],
    queryFn: listNotificationTypes,
  });

  const [pushState, setPushState] = useState<'subscribed' | 'unsubscribed' | 'unsupported' | 'loading'>('loading');
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    getPushSubscriptionState().then(setPushState);
  }, []);

  async function togglePush(checked: boolean) {
    setPushBusy(true);
    try {
      if (checked) {
        await enablePushNotifications();
        setPushState('subscribed');
        toast({ title: 'Browser notifications enabled', variant: 'success' });
      } else {
        await disablePushNotifications();
        setPushState('unsubscribed');
        toast({ title: 'Browser notifications disabled', variant: 'success' });
      }
    } catch (err) {
      toast({ title: 'Could not update browser notifications', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    } finally {
      setPushBusy(false);
    }
  }

  const updateMutation = useMutation({
    mutationFn: updateNotificationPreferences,
    // Flip the switch/checkbox instantly by merging the change into the cached
    // preferences; onSuccess then swaps in the server's authoritative record and
    // onError rolls the optimistic change back.
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<NotificationPreferences>(QUERY_KEY);
      queryClient.setQueryData<NotificationPreferences>(QUERY_KEY, (old) => (old ? { ...old, ...input } : old));
      return { previous };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(QUERY_KEY, result);
      toast({ title: 'Notification preference saved', variant: 'success' });
    },
    onError: (err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY, context.previous);
      toast({
        title: 'Could not save preference',
        description: err instanceof ApiClientError ? err.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  function toggleMutedType(key: string, muted: boolean) {
    const current = data?.mutedTypes ?? [];
    const next = muted ? [...current, key] : current.filter((k) => k !== key);
    updateMutation.mutate({ mutedTypes: next });
  }

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>Settings</PanelTitle>
          <PanelDescription>Personal preferences for this account.</PanelDescription>
        </div>
      </PanelHeader>

      <Card className="max-w-lg">
        <CardHeader className="flex-col items-start gap-1">
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how FleetHQ looks on this device.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              type="button"
              variant={theme === value ? 'primary' : 'secondary'}
              onClick={() => setTheme(value)}
              className={cn('flex-1')}
            >
              <Icon className="h-4 w-4" /> {label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card className="max-w-lg">
        <CardHeader className="flex-col items-start gap-1">
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Control how you're pinged about activity in this company.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-full" />
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="digest-only-switch">Digest only</Label>
                <p className="text-xs text-(--text-tertiary)">
                  Skip the live unread badge — everything still gets recorded and shows up in the email digest.
                </p>
              </div>
              <Switch
                id="digest-only-switch"
                checked={data?.digestOnly ?? false}
                disabled={updateMutation.isPending}
                onCheckedChange={(checked) => updateMutation.mutate({ digestOnly: checked })}
              />
            </div>
          )}

          {notificationTypes && notificationTypes.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-(--border-subtle) pt-4">
              <Label>Mute specific notifications</Label>
              <p className="text-xs text-(--text-tertiary)">
                Muted types are never recorded — they won't appear in-app, as a push, or in the email digest.
              </p>
              <div className="space-y-2 pt-1">
                {notificationTypes.map((t) => (
                  <div key={t.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`mute-${t.key}`}
                      checked={!!data?.mutedTypes?.includes(t.key)}
                      disabled={updateMutation.isPending}
                      onCheckedChange={(checked) => toggleMutedType(t.key, checked === true)}
                    />
                    <Label htmlFor={`mute-${t.key}`} className="font-normal">
                      {t.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-4 border-t border-(--border-subtle) pt-4">
            <div className="space-y-0.5">
              <Label htmlFor="push-switch">Browser notifications</Label>
              <p className="text-xs text-(--text-tertiary)">Get a live push notification on this device, even in another tab.</p>
              {!isPushSupported() ? (
                <p className="text-xs text-warning-500">This browser doesn’t support push notifications.</p>
              ) : !isSecureForPush() ? (
                <p className="text-xs text-warning-500">Unavailable over an insecure connection — open the app over https (or localhost) to enable.</p>
              ) : null}
            </div>
            <Switch
              id="push-switch"
              checked={pushState === 'subscribed'}
              disabled={pushBusy || pushState === 'loading' || !isPushSupported() || !isSecureForPush()}
              onCheckedChange={togglePush}
            />
          </div>
        </CardContent>
      </Card>
    </Panel>
  );
}
