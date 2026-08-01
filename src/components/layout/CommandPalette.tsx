import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  BookUser,
  Clock,
  CornerDownLeft,
  Map as MapIcon,
  Search,
  ShieldCheck,
  Truck,
  Users,
  Warehouse,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { NAV_ITEMS } from '@/app/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { useReadRecentPages } from '@/hooks/useRecentPages';
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

interface FlatAction {
  key: string;
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  path: string;
}

/**
 * Foundation for Universal Search (01-Product/Universal_Search.md). Covers two
 * of the doc's modes — navigation ("jump to a page you have permission for")
 * and real entity search — plus a "recently viewed" affordance and full
 * keyboard control (↑/↓ to move, ↵ to open). Natural-language intent resolution
 * and the Command Bar's direct-action mode remain deferred per that doc.
 */
export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const { canAny } = usePermissions();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, refreshRecent] = useReadRecentPages();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(handle);
  }, [query]);

  // Reset transient state each time it opens, and refresh the recents snapshot.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      refreshRecent();
    }
  }, [open, refreshRecent]);

  const availableNav = useMemo(
    () =>
      NAV_ITEMS.filter(
        (item) => item.status === 'active' && (!item.permissions || canAny(item.permissions)),
      ),
    [canAny],
  );

  const navResults = useMemo(() => {
    if (!query.trim()) return availableNav;
    return availableNav.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
  }, [query, availableNav]);

  const recentActions: FlatAction[] = useMemo(() => {
    if (query.trim()) return [];
    const byPath = new Map(availableNav.map((n) => [n.path, n]));
    return recent
      .filter((r) => byPath.has(r.path))
      .map((r) => {
        const nav = byPath.get(r.path)!;
        return { key: `recent:${r.path}`, label: r.label, icon: nav.icon, path: r.path };
      });
  }, [recent, query, availableNav]);

  const { data: entityResults } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchApi(debouncedQuery),
    enabled: open && debouncedQuery.length >= 2,
  });

  const navActions: FlatAction[] = navResults.map((item) => ({
    key: `nav:${item.path}`,
    label: item.label,
    sublabel: item.group,
    icon: item.icon,
    path: item.path,
  }));

  const entityActions: FlatAction[] = (entityResults ?? []).map((item: SearchResultItem) => ({
    key: `entity:${item.type}:${item.id}`,
    label: item.title,
    sublabel: item.subtitle ?? TYPE_LABEL[item.type] ?? item.type,
    icon: TYPE_ICON[item.type] ?? Search,
    path: item.linkPath,
  }));

  // One flat, ordered action list drives keyboard navigation across sections.
  const sections = [
    { label: 'Recent', actions: recentActions },
    { label: query.trim() ? 'Pages' : 'Jump to', actions: navActions },
    { label: 'Records', actions: entityActions },
  ].filter((s) => s.actions.length > 0);

  const flat = sections.flatMap((s) => s.actions);

  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(0, flat.length - 1)));
  }, [flat.length]);

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  function go(path: string) {
    navigate(path);
    setOpen(false);
    setQuery('');
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (flat.length ? (i + 1) % flat.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const action = flat[activeIndex];
      if (action) go(action.path);
    }
  }

  let runningIndex = -1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent hideClose className="top-24 max-w-xl translate-y-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Search FleetHQ</DialogTitle>

        <div className="flex items-center gap-2.5 border-b border-(--border-subtle) px-4">
          <Search className="h-4 w-4 shrink-0 text-(--text-tertiary)" />
          <input
            autoFocus
            placeholder="Search pages, assets, operators, jobs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            className="h-12 flex-1 bg-transparent text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:outline-none"
          />
          <kbd className="hidden rounded border border-(--border-subtle) px-1.5 py-0.5 text-[10px] font-medium text-(--text-tertiary) sm:inline">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[22rem] overflow-y-auto p-2">
          {flat.length === 0 && (
            <p className="px-2 py-8 text-center text-sm text-(--text-tertiary)">
              {debouncedQuery.length >= 2 ? 'No matching pages or records.' : 'Start typing to search…'}
            </p>
          )}

          {sections.map((section) => (
            <div key={section.label} className="mb-1">
              <p className="eyebrow flex items-center gap-1.5 px-2.5 pb-1 pt-2">
                {section.label === 'Recent' && <Clock className="h-3 w-3" />}
                {section.label}
              </p>
              {section.actions.map((action) => {
                runningIndex += 1;
                const index = runningIndex;
                const isActive = index === activeIndex;
                const Icon = action.icon;
                return (
                  <button
                    key={action.key}
                    type="button"
                    data-active={isActive}
                    onMouseMove={() => setActiveIndex(index)}
                    onClick={() => go(action.path)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                      isActive ? 'bg-accent-500/12 text-(--text-primary)' : 'text-(--text-secondary)',
                    )}
                  >
                    <Icon
                      className={cn('h-4 w-4 shrink-0', isActive ? 'text-accent-500' : 'text-(--text-tertiary)')}
                    />
                    <span className="flex-1 truncate">{action.label}</span>
                    {action.sublabel && (
                      <span className="truncate text-xs text-(--text-tertiary)">{action.sublabel}</span>
                    )}
                    {isActive && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-(--text-tertiary)" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 border-t border-(--border-subtle) bg-(--surface-1)/60 px-4 py-2 text-[11px] text-(--text-tertiary)">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-(--border-subtle) px-1">↑</kbd>
            <kbd className="rounded border border-(--border-subtle) px-1">↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-(--border-subtle) px-1">↵</kbd>
            open
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
