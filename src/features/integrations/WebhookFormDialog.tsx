import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listConnections, listCredentials } from '@/api/integrations';
import type { CreateWebhookInput, IntegrationWebhook, IntegrationWebhookDirection } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PickerError } from '@/components/ui/picker-error';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface WebhookFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhook?: IntegrationWebhook;
  isSubmitting: boolean;
  onSubmit: (input: CreateWebhookInput) => Promise<void>;
}

/** Create/edit a webhook. Direction and linked connection are fixed at create time — only the other settings can change on edit. */
export function WebhookFormDialog({ open, onOpenChange, webhook, isSubmitting, onSubmit }: WebhookFormDialogProps) {
  const [name, setName] = useState('');
  const [direction, setDirection] = useState<IntegrationWebhookDirection>('INCOMING');
  const [connectionId, setConnectionId] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [secretCredentialId, setSecretCredentialId] = useState('');
  const [headerLines, setHeaderLines] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);

  const connectionsQuery = useQuery({ queryKey: ['integrations', 'connections'], queryFn: () => listConnections(), enabled: open });
  const credentialsQuery = useQuery({ queryKey: ['integrations', 'credentials'], queryFn: () => listCredentials(), enabled: open });

  useEffect(() => {
    if (!open) return;
    setName(webhook?.name ?? '');
    setDirection(webhook?.direction ?? 'INCOMING');
    setConnectionId(webhook?.connectionId ?? '');
    setTargetUrl(webhook?.targetUrl ?? '');
    setSecretCredentialId(webhook?.secretCredentialId ?? '');
    setHeaderLines(Object.entries(webhook?.headerTemplate ?? {}).map(([k, v]) => `${k}=${v}`).join('\n'));
    setIsEnabled(webhook?.isEnabled ?? true);
  }, [open, webhook]);

  const isEditing = !!webhook;

  function buildHeaderTemplate(): Record<string, string> | undefined {
    const entries: Record<string, string> = {};
    for (const line of headerLines.split('\n')) {
      const [key, ...rest] = line.split('=');
      if (key?.trim() && rest.length > 0) entries[key.trim()] = rest.join('=').trim();
    }
    return Object.keys(entries).length > 0 ? entries : undefined;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit webhook' : 'New webhook'}</DialogTitle>
          <DialogDescription>Incoming: FleetHQ receives at a generated URL. Outgoing: FleetHQ posts to a URL you provide.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="wh-name">Name</Label>
            <Input id="wh-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {!isEditing && (
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as IntegrationWebhookDirection)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOMING">Incoming (FleetHQ receives)</SelectItem>
                  <SelectItem value="OUTGOING">Outgoing (FleetHQ sends)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {direction === 'OUTGOING' && (
            <div className="space-y-1.5">
              <Label htmlFor="wh-target">Target URL</Label>
              <Input id="wh-target" placeholder="https://example.com/webhooks/fleethq" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} />
            </div>
          )}

          {!isEditing && (
            <div className="space-y-1.5">
              <Label>Linked connection (optional)</Label>
              <Select value={connectionId || '__none__'} onValueChange={(v) => setConnectionId(v === '__none__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {(connectionsQuery.data?.items ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <PickerError query={connectionsQuery} noun="connections" />
              {direction === 'INCOMING' && <p className="text-xs text-(--text-tertiary)">If linked, an incoming payload is mapped and synced into that connection's target entity.</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Signing secret (optional)</Label>
            <Select value={secretCredentialId || '__none__'} onValueChange={(v) => setSecretCredentialId(v === '__none__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {(credentialsQuery.data?.items ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PickerError query={credentialsQuery} noun="credentials" />
            <p className="text-xs text-(--text-tertiary)">
              {direction === 'INCOMING' ? 'Verifies the X-FleetHQ-Signature header on every delivery.' : 'Signs outgoing deliveries with X-FleetHQ-Signature (HMAC-SHA256).'}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wh-headers">Extra headers (one per line, "Name=value")</Label>
            <Textarea id="wh-headers" rows={3} placeholder={'X-Source=FleetHQ'} value={headerLines} onChange={(e) => setHeaderLines(e.target.value)} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-(--border-subtle) p-3">
            <p className="text-sm font-medium text-(--text-primary)">Enabled</p>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={isSubmitting || !name.trim() || (direction === 'OUTGOING' && !targetUrl.trim())}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                direction,
                connectionId: connectionId || undefined,
                targetUrl: direction === 'OUTGOING' ? targetUrl.trim() : undefined,
                secretCredentialId: secretCredentialId || undefined,
                headerTemplate: buildHeaderTemplate(),
                isEnabled,
              })
            }
          >
            {isSubmitting ? 'Saving…' : isEditing ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
