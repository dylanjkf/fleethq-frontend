import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CreateCredentialInput, IntegrationAuthType, IntegrationCredential } from '@/api/integrations';

const AUTH_TYPES: { value: IntegrationAuthType; label: string; helper: string }[] = [
  { value: 'NONE', label: 'None', helper: 'No secret needed (e.g. an open endpoint, or credentials handled elsewhere).' },
  { value: 'API_KEY', label: 'API key', helper: 'Sent as a header — the connection\'s config picks the header name (default X-API-Key).' },
  { value: 'BEARER_TOKEN', label: 'Bearer token', helper: 'Sent as "Authorization: Bearer <token>".' },
  { value: 'BASIC_AUTH', label: 'Basic auth', helper: 'Enter as "username:password" — sent as "Authorization: Basic <base64>".' },
  { value: 'WEBHOOK_SECRET', label: 'Webhook signing secret', helper: 'Used to sign/verify webhook payloads (HMAC-SHA256).' },
];

interface CredentialFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential?: IntegrationCredential;
  isSubmitting: boolean;
  onSubmit: (input: CreateCredentialInput) => Promise<void>;
}

/**
 * Create/rotate a vault credential. The secret input only ever appears here —
 * on edit, it's blank ("leave blank to keep the current secret") and never
 * pre-filled, because the API never returns it (that's the whole point of the vault).
 */
export function CredentialFormDialog({ open, onOpenChange, credential, isSubmitting, onSubmit }: CredentialFormDialogProps) {
  const [name, setName] = useState('');
  const [authType, setAuthType] = useState<IntegrationAuthType>('API_KEY');
  const [secretValue, setSecretValue] = useState('');

  useEffect(() => {
    if (open) {
      setName(credential?.name ?? '');
      setAuthType(credential?.authType ?? 'API_KEY');
      setSecretValue('');
    }
  }, [open, credential]);

  const isEditing = !!credential;
  const helper = AUTH_TYPES.find((a) => a.value === authType)?.helper;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit credential' : 'New credential'}</DialogTitle>
          <DialogDescription>Stored encrypted at rest — never shown again once saved.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cred-name">Name</Label>
            <Input id="cred-name" placeholder="e.g. Acme ERP API key" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {!isEditing && (
            <div className="space-y-1.5">
              <Label>Auth type</Label>
              <Select value={authType} onValueChange={(v) => setAuthType(v as IntegrationAuthType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTH_TYPES.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {helper && <p className="text-xs text-(--text-tertiary)">{helper}</p>}
            </div>
          )}
          {authType !== 'NONE' && (
            <div className="space-y-1.5">
              <Label htmlFor="cred-secret">{isEditing ? 'Rotate secret (leave blank to keep the current one)' : 'Secret value'}</Label>
              <Input id="cred-secret" type="password" placeholder={isEditing ? '••••••••' : 'Paste the secret'} value={secretValue} onChange={(e) => setSecretValue(e.target.value)} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={isSubmitting || !name.trim()}
            onClick={() => onSubmit({ name: name.trim(), authType, secretValue: secretValue.trim() || undefined })}
          >
            {isSubmitting ? 'Saving…' : isEditing ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
