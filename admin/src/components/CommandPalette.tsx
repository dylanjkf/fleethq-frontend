import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { globalSearch } from '@/api/search';
import { useAuth } from '@/hooks/useAuth';
import { useModalDialog } from '@/hooks/useModalDialog';

/** Nav destinations reachable from the palette, each with the permission that reveals it. */
const DESTINATIONS: { label: string; to: string; permission?: string }[] = [
  { label: 'Dashboard', to: '/', permission: 'analytics:view' },
  { label: 'Alerts', to: '/notifications', permission: 'analytics:view' },
  { label: 'Organisations', to: '/organisations', permission: 'organisations:view' },
  { label: 'New customer login', to: '/organisations/new', permission: 'organisations:create' },
  { label: 'Customer Users', to: '/customer-users', permission: 'customer_users:view' },
  { label: 'Billing', to: '/billing', permission: 'billing:view' },
  { label: 'Inspections', to: '/inspections', permission: 'inspections:view' },
  { label: 'Defects', to: '/maintenance', permission: 'maintenance:view' },
  { label: 'Fleet', to: '/fleet', permission: 'fleet:view' },
  { label: 'Feature Flags', to: '/feature-flags', permission: 'feature_flags:view' },
  { label: 'Announcements', to: '/announcements', permission: 'support:view' },
  { label: 'System Health', to: '/system', permission: 'system:view' },
  { label: 'Staff Accounts', to: '/admin-users', permission: 'admin_users:view' },
  { label: 'Security', to: '/security', permission: 'security:view' },
  { label: 'Audit Log', to: '/audit-log', permission: 'audit_log:view' },
];

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  // Shared accessible-modal behaviour (focus trap, Escape-anywhere, focus
  // restore) instead of the previous input-only Escape and no trap (Round 3).
  const dialogRef = useModalDialog<HTMLDivElement>(onClose);
  const debouncedQ = useDebounced(q, 200);

  useEffect(() => {
    if (open) {
      setQ('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const destinations = useMemo(
    () => DESTINATIONS.filter((d) => !d.permission || hasPermission(d.permission)).filter((d) => d.label.toLowerCase().includes(q.trim().toLowerCase())),
    [q, hasPermission],
  );

  const searchQuery = useQuery({
    queryKey: ['command-search', debouncedQ],
    queryFn: () => globalSearch(debouncedQ),
    enabled: open && debouncedQ.trim().length >= 2 && hasPermission('organisations:view'),
  });

  if (!open) return null;

  function go(to: string) {
    onClose();
    navigate(to);
  }

  const results = searchQuery.data;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-24" onClick={onClose}>
      <div
        ref={dialogRef}
        className="w-full max-w-xl overflow-hidden rounded-xl border border-(--border-subtle) bg-(--surface-1) shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette — search organisations, users, and assets, or jump to a page"
        tabIndex={-1}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search organisations, users, assets, or jump to a page"
          placeholder="Search organisations, users, assets… or jump to a page"
          className="w-full border-b border-(--border-subtle) bg-transparent px-5 py-4 text-sm outline-none placeholder:text-(--text-tertiary)"
        />
        <div className="max-h-96 overflow-y-auto p-2 text-sm">
          {destinations.length > 0 && (
            <Section title="Go to">
              {destinations.map((d) => (
                <Row key={d.to} onClick={() => go(d.to)}>
                  {d.label}
                </Row>
              ))}
            </Section>
          )}

          {results && results.companies.length > 0 && (
            <Section title="Organisations">
              {results.companies.map((c) => (
                <Row key={c.id} onClick={() => go(`/organisations/${c.id}`)}>
                  {c.name}
                </Row>
              ))}
            </Section>
          )}
          {results && results.users.length > 0 && (
            <Section title="Customer users">
              {results.users.map((u) => (
                <Row key={u.id} onClick={() => go(`/customer-users/${u.id}`)}>
                  {u.fullName}
                  <span className="text-(--text-tertiary)"> · {u.email ?? ''}</span>
                </Row>
              ))}
            </Section>
          )}
          {results && results.assets.length > 0 && (
            <Section title="Assets">
              {results.assets.map((a) => (
                <Row key={a.id} onClick={() => go(`/organisations/${a.company.id}`)}>
                  {a.name}
                  <span className="text-(--text-tertiary)"> · {a.company.name}</span>
                </Row>
              ))}
            </Section>
          )}

          {destinations.length === 0 &&
            !results?.companies.length &&
            !results?.users.length &&
            !results?.assets.length &&
            // Distinguish searching / failed / genuinely-empty instead of always
            // claiming "No matches" (Round 3): a slow or failed search read no
            // longer reads as "nothing found".
            (searchQuery.isFetching ? (
              <p className="px-3 py-6 text-center text-(--text-tertiary)" role="status">
                Searching…
              </p>
            ) : searchQuery.isError ? (
              <p className="px-3 py-6 text-center text-danger-400" role="alert">
                Search failed — try again.
              </p>
            ) : (
              <p className="px-3 py-6 text-center text-(--text-tertiary)">No matches.</p>
            ))}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-(--text-tertiary)">{title}</p>
      {children}
    </div>
  );
}

function Row({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-(--surface-2)">
      {children}
    </button>
  );
}
