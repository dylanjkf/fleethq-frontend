import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { createOrganisation, type IssuedCustomerLogin } from '@/api/organisations';
import { ApiClientError } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

/** Turn a server error into a message that makes sense to a human operator. */
function errorMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    if (err.code === 'EMAIL_IN_USE') return 'A login with that email already exists. Use a different email, or find the existing account under Organisations.';
    if (err.status === 400) return 'Please enter a valid company name and email address.';
    if (err.status === 403) return "You don't have permission to issue customer logins.";
    if (err.status === 429) return 'Too many requests just now — wait a moment and try again.';
    return err.message || 'Could not issue the login. Please try again.';
  }
  return 'Could not issue the login. Please try again.';
}

/** One labelled read-only value with a copy button — used for each credential. */
function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (e.g. insecure context) — the value is selectable on screen regardless.
    }
  };
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-(--text-tertiary)">{label}</div>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg border border-(--border-subtle) bg-(--surface-1) px-3 py-2 text-sm text-(--text-primary)">{value}</code>
        <Button type="button" variant="secondary" size="sm" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}

function IssuedCredentials({ issued, onIssueAnother }: { issued: IssuedCustomerLogin; onIssueAnother: () => void }) {
  return (
    <Card className="p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-(--text-primary)">Login issued for {issued.companyName}</h2>
        <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
          Copy these now — the temporary password is shown once and cannot be retrieved again.
        </p>
      </div>

      <div className="space-y-3">
        <CopyField label="Login (email)" value={issued.username} />
        <CopyField label="Temporary password" value={issued.temporaryPassword} />
      </div>

      <p className="text-sm text-(--text-secondary)">
        Send these to the customer over a secure channel. On first sign-in at fleethq.online they'll be
        required to set their own password before they can use the account.
      </p>

      <div className="flex gap-3">
        <Button type="button" onClick={onIssueAnother}>Issue another</Button>
        <Link to={`/organisations/${issued.companyId}`}>
          <Button type="button" variant="secondary">View organisation</Button>
        </Link>
      </div>
    </Card>
  );
}

export function NewCustomerLoginPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('organisations:create');

  const [companyName, setCompanyName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminFullName, setAdminFullName] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      createOrganisation({
        companyName: companyName.trim(),
        adminEmail: adminEmail.trim(),
        adminFullName: adminFullName.trim() || undefined,
      }),
  });

  const canSubmit = canCreate && companyName.trim().length > 0 && adminEmail.trim().length > 0 && !mutation.isPending;

  if (!canCreate) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Issue a customer login</h1>
        <Card className="p-5">
          <p className="text-sm text-(--text-secondary)">You don't have permission to issue customer logins.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Issue a customer login</h1>
        <p className="mt-1 text-sm text-(--text-secondary)">
          Creates a new customer organisation and its first administrator login. A one-time temporary
          password is generated and shown once.
        </p>
      </div>

      {mutation.isSuccess ? (
        <IssuedCredentials
          issued={mutation.data}
          onIssueAnother={() => {
            setCompanyName('');
            setAdminEmail('');
            setAdminFullName('');
            mutation.reset();
          }}
        />
      ) : (
        <Card className="p-5">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) mutation.mutate();
            }}
          >
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-(--text-secondary)">Company name</span>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Freight"
                maxLength={200}
                autoFocus
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-(--text-secondary)">Customer email (their login)</span>
              <Input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="owner@acmefreight.com.au"
                maxLength={320}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-(--text-secondary)">
                Contact name <span className="text-(--text-tertiary)">(optional)</span>
              </span>
              <Input
                value={adminFullName}
                onChange={(e) => setAdminFullName(e.target.value)}
                placeholder="Dana Owner"
                maxLength={200}
              />
            </label>

            {mutation.isError && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {errorMessage(mutation.error)}
              </p>
            )}

            <Button type="submit" disabled={!canSubmit}>
              {mutation.isPending ? 'Issuing…' : 'Issue login'}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
