import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { BookUser, Map as MapIcon, Search, ShieldCheck, Truck, Users, Warehouse, Wrench, type LucideIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NAV_ITEMS } from '@/app/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { search as searchApi, type SearchResultItem } from '@/api/search';
import { cn } from '@/lib/cn';

const TYPE_ICON: Record<string, LucideIcon> = {
  asset: Truck,
  attachedUnit: Truck,
  operator: Users,
  customer: BookUser,
  depot: Warehouse,
  job: MapIcon,
  maintenanceJob: Wrench,
  complianceDocument: ShieldCheck,
};

const TYPE_LABEL: Record<string, string> = {
  asset: 'Assets',
  attachedUnit: 'Attached Units',
  operator: 'Operators',
  customer: 'Customers',
  depot: 'Depots',
  job: 'Jobs',
  maintenanceJob: 'Maintenance',
  complianceDocument: 'Compliance',
};

/**
 * Foundation for Universal Search (01-Product/Universal_Search.md) — this
 * now covers two of the doc's own modes: navigation ("jump to a page you
 * have permission for") and real entity search ("find an Asset/Operator by
 * name"), the latter via GET /v1/search's literal, permission-filtered
 * substring match. Natural-language intent resolution and the Command
 * Bar's direct-action mode are NOT built here — see the doc's own
 * Implementation notes for what's deliberately deferred.
 */
export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const { canAny } = usePermissions();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(handle);
  }, [query]);

  const navResults = useMemo(() => {
    const available = NAV_ITEMS.filter(
      (item) => item.status === 'active' && (!item.permissions || canAny(item.permissions)),
    );
    if (!query.trim()) return available;
    return available.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
  }, [query, canAny]);

  const { data: entityResults } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchApi(debouncedQuery),
    enabled: open && debouncedQuery.length >= 2,
  });

  const groupedEntityResults = useMemo(() => {
    const groups = new Map<string, SearchResultItem[]>();
    for (const item of entityResults ?? []) {
      const list = groups.get(item.type) ?? [];
      list.push(item);
      groups.set(item.type, list);
    }
    return [...groups.entries()];
  }, [entityResults]);

  function go(path: string) {
    navigate(path);
    setOpen(false);
    setQuery('');
  }

  const hasAnyResults = navResults.length > 0 || groupedEntityResults.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-32 max-w-md translate-y-0 p-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="flex items-center gap-2 border-b border-(--border-subtle) px-3">
          <Search className="h-4 w-4 text-(--text-tertiary)" />
          <Input
            autoFocus
            aria-label="Search pages, assets, operators, jobs"
            placeholder="Search pages, assets, operators, jobs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-none focus-visible:ring-0"
          />
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {!hasAnyResults && (
            <p className="px-2 py-6 text-center text-sm text-(--text-tertiary)">No matching pages or records.</p>
          )}

          {navResults.length > 0 && (
            <div className="mb-1">
              {query.trim() && <p className="px-2.5 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-(--text-tertiary)">Pages</p>}
              {navResults.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => go(item.path)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm',
                      'text-(--text-primary) hover:bg-(--surface-2)',
                    )}
                  >
                    <Icon className="h-4 w-4 text-(--text-tertiary)" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}

          {groupedEntityResults.map(([type, items]) => {
            const Icon = TYPE_ICON[type] ?? Search;
            return (
              <div key={type} className="mb-1">
                <p className="px-2.5 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-(--text-tertiary)">
                  {TYPE_LABEL[type] ?? type}
                </p>
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(item.linkPath)}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-(--text-primary) hover:bg-(--surface-2)"
                  >
                    <Icon className="h-4 w-4 text-(--text-tertiary)" />
                    <span className="flex-1 truncate">{item.title}</span>
                    {item.subtitle && <span className="text-xs text-(--text-tertiary)">{item.subtitle}</span>}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
