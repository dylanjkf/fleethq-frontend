import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Link, useLocation } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getAdminAlerts } from '@/api/notifications';
import { CommandPalette } from '@/components/CommandPalette';

interface NavItem {
  to: string;
  label: string;
  permission?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', permission: 'analytics:view' },
  { to: '/notifications', label: 'Alerts', permission: 'analytics:view' },
  { to: '/organisations', label: 'Organisations', permission: 'organisations:view' },
  { to: '/customer-users', label: 'Customer Users', permission: 'customer_users:view' },
  { to: '/announcements', label: 'Announcements', permission: 'support:view' },
  { to: '/feature-flags', label: 'Feature Flags', permission: 'feature_flags:view' },
  { to: '/fleet', label: 'Fleet', permission: 'fleet:view' },
  { to: '/inspections', label: 'Inspections', permission: 'inspections:view' },
  { to: '/maintenance', label: 'Defects', permission: 'maintenance:view' },
  { to: '/system', label: 'System Health', permission: 'system:view' },
  { to: '/admin-users', label: 'Staff Accounts', permission: 'admin_users:view' },
  { to: '/security', label: 'Security', permission: 'security:view' },
  { to: '/audit-log', label: 'Audit Log', permission: 'audit_log:view' },
];

/** Best-effort label for the current top-level section, for the breadcrumb. */
function sectionLabel(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  const seg = pathname.split('/').filter(Boolean)[0] ?? '';
  const match = NAV_ITEMS.find((n) => n.to === `/${seg}`);
  if (match) return match.label;
  return seg ? seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ') : 'Dashboard';
}

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-accent-500/15 text-accent-400' : 'text-(--text-secondary) hover:bg-(--surface-2) hover:text-(--text-primary)'
  }`;

export function AppShell({ children }: { children: ReactNode }) {
  const { admin, hasPermission, logout } = useAuth();
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const visibleItems = NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission));

  const alertsQuery = useQuery({
    queryKey: ['admin-alerts', 'bell'],
    queryFn: getAdminAlerts,
    enabled: hasPermission('analytics:view'),
    refetchInterval: 60_000,
  });
  const alertCount = alertsQuery.data?.alerts.length ?? 0;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-(--border-subtle) bg-(--surface-1) p-4">
        <div className="mb-6 px-2">
          <p className="text-sm font-bold tracking-tight">FleetHQ Admin</p>
          <p className="text-xs text-(--text-tertiary)">Internal platform ops</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {visibleItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClasses} end={item.to === '/'}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 border-t border-(--border-subtle) pt-4">
          <NavLink to="/settings" className={linkClasses}>
            Security settings
          </NavLink>
          <div className="mt-3 px-3">
            <p className="truncate text-sm font-medium">{admin?.fullName}</p>
            <p className="truncate text-xs text-(--text-tertiary)">{admin?.role.name}</p>
          </div>
          <button
            onClick={() => void logout()}
            className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-(--text-secondary) transition-colors hover:bg-(--surface-2) hover:text-(--text-primary)"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-(--border-subtle) bg-(--surface-1) px-6 py-3">
          <nav className="text-sm text-(--text-secondary)" aria-label="Breadcrumb">
            <span className="text-(--text-tertiary)">Admin</span>
            <span className="mx-2 text-(--text-tertiary)">/</span>
            <span className="font-medium text-(--text-primary)">{sectionLabel(location.pathname)}</span>
          </nav>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-(--border-subtle) bg-(--surface-2) px-3 py-1.5 text-sm text-(--text-secondary) hover:text-(--text-primary)"
            >
              Search…
              <kbd className="rounded bg-(--surface-1) px-1.5 py-0.5 text-xs text-(--text-tertiary)">⌘K</kbd>
            </button>
            {hasPermission('analytics:view') && (
              <Link to="/notifications" className="relative rounded-lg px-2 py-1.5 text-(--text-secondary) hover:bg-(--surface-2) hover:text-(--text-primary)" aria-label="Alerts">
                🔔
                {alertCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-semibold text-white">
                    {alertCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl p-6">{children}</div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
