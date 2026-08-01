import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listCredentials, TARGET_ENTITIES, TARGET_ENTITY_LABELS } from '@/api/integrations';
import type { CreateConnectionInput, IntegrationConnection, IntegrationConnectorType, IntegrationDirection, TargetEntity } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PickerError } from '@/components/ui/picker-error';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const CONNECTOR_TYPES: { value: IntegrationConnectorType; label: string; description: string }[] = [
  { value: 'CSV', label: 'CSV / Excel', description: 'Upload a file, map its columns, sync — no external endpoint needed.' },
  { value: 'REST', label: 'Generic REST poller', description: 'Polls a JSON API on a schedule (or on demand) and maps the response.' },
  { value: 'WEBHOOK', label: 'Incoming webhook', description: 'The external system pushes to a FleetHQ URL instead of being polled.' },
];

const DIRECTIONS: { value: IntegrationDirection; label: string }[] = [
  { value: 'IMPORT', label: 'Import (external → FleetHQ)' },
  { value: 'EXPORT', label: 'Export (FleetHQ → external)' },
  { value: 'BIDIRECTIONAL', label: 'Bidirectional' },
];

interface ConnectionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection?: IntegrationConnection;
  isSubmitting: boolean;
  onSubmit: (input: CreateConnectionInput) => Promise<void>;
}

/**
 * Create/edit a connection. Config fields are shown conditionally by
 * connectorType — REST needs a url/header/response-path, CSV and WEBHOOK
 * connectors carry no connector-specific config today (CSV rows are posted
 * directly at sync time; WEBHOOK connections are driven by the linked
 * IntegrationWebhook, managed on the Webhooks tab).
 */
export function ConnectionFormDialog({ open, onOpenChange, connection, isSubmitting, onSubmit }: ConnectionFormDialogProps) {
  const [name, setName] = useState('');
  const [connectorType, setConnectorType] = useState<IntegrationConnectorType>('CSV');
  const [direction, setDirection] = useState<IntegrationDirection>('IMPORT');
  const [targetEntity, setTargetEntity] = useState<TargetEntity>('customers');
  const [credentialId, setCredentialId] = useState<string>('');
  const [scheduleCron, setScheduleCron] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [restUrl, setRestUrl] = useState('');
  const [apiKeyHeader, setApiKeyHeader] = useState('');
  const [responseArrayPath, setResponseArrayPath] = useState('');

  const credentialsQuery = useQuery({ queryKey: ['integrations', 'credentials'], queryFn: () => listCredentials(), enabled: open });

  useEffect(() => {
    if (!open) return;
    setName(connection?.name ?? '');
    setConnectorType(connection?.connectorType ?? 'CSV');
    setDirection(connection?.direction ?? 'IMPORT');
    setTargetEntity(connection?.targetEntity ?? 'customers');
    setCredentialId(connection?.credentialId ?? '');
    setScheduleCron(connection?.scheduleCron ?? '');
    setIsEnabled(connection?.isEnabled ?? true);
    const config = connection?.config ?? {};
    setRestUrl(typeof config.url === 'string' ? config.url : '');
    setApiKeyHeader(typeof config.apiKeyHeader === 'string' ? config.apiKeyHeader : '');
    setResponseArrayPath(typeof config.responseArrayPath === 'string' ? config.responseArrayPath : '');
  }, [open, connection]);

  const isEditing = !!connection;

  function buildConfig(): Record<string, unknown> {
    if (connectorType !== 'REST') return {};
    const config: Record<string, unknown> = { url: restUrl.trim() };
    if (apiKeyHeader.trim()) config.apiKeyHeader = apiKeyHeader.trim();
    if (responseArrayPath.trim()) config.responseArrayPath = responseArrayPath.trim();
    return config;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit connection' : 'New connection'}</DialogTitle>
          <DialogDescription>Pick a connector, the FleetHQ entity it syncs, and how it authenticates.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="conn-name">Name</Label>
            <Input id="conn-name" placeholder="e.g. Acme ERP customer sync" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {!isEditing && (
            <div className="space-y-1.5">
              <Label>Connector</Label>
              <Select value={connectorType} onValueChange={(v) => setConnectorType(v as IntegrationConnectorType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONNECTOR_TYPES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-(--text-tertiary)">{CONNECTOR_TYPES.find((c) => c.value === connectorType)?.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as IntegrationDirection)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIRECTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Target entity</Label>
              <Select value={targetEntity} onValueChange={(v) => setTargetEntity(v as TargetEntity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_ENTITIES.map((entity) => (
                    <SelectItem key={entity} value={entity}>
                      {TARGET_ENTITY_LABELS[entity]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {connectorType === 'REST' && (
            <div className="space-y-3 rounded-lg border border-(--border-subtle) p-3">
              <p className="text-xs font-medium text-(--text-tertiary)">REST poller settings</p>
              <div className="space-y-1.5">
                <Label htmlFor="rest-url">Endpoint URL</Label>
                <Input id="rest-url" placeholder="https://api.example.com/customers" value={restUrl} onChange={(e) => setRestUrl(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rest-api-header">API key header</Label>
                  <Input id="rest-api-header" placeholder="X-API-Key" value={apiKeyHeader} onChange={(e) => setApiKeyHeader(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rest-array-path">Response array path</Label>
                  <Input id="rest-array-path" placeholder="data.items" value={responseArrayPath} onChange={(e) => setResponseArrayPath(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Credential (optional)</Label>
            <Select value={credentialId || '__none__'} onValueChange={(v) => setCredentialId(v === '__none__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {(credentialsQuery.data?.items ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.authType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PickerError query={credentialsQuery} noun="credentials" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="conn-cron">Schedule (5-field cron, optional)</Label>
            <Input id="conn-cron" placeholder="e.g. */15 * * * * (every 15 min)" value={scheduleCron} onChange={(e) => setScheduleCron(e.target.value)} />
            <p className="text-xs text-(--text-tertiary)">Leave blank to run manually only.</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-(--border-subtle) p-3">
            <div>
              <p className="text-sm font-medium text-(--text-primary)">Enabled</p>
              <p className="text-xs text-(--text-tertiary)">Disabled connections never run on schedule.</p>
            </div>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={isSubmitting || !name.trim() || (connectorType === 'REST' && !restUrl.trim())}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                connectorType,
                direction,
                targetEntity,
                config: buildConfig(),
                credentialId: credentialId || undefined,
                scheduleCron: scheduleCron.trim() || undefined,
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
