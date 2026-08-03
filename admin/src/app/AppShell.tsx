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
  { to: '/billing', label: 'Billing', permission: 'billing:view' },
  { to: '/announcements', label: 'Announcements', permission: 'support:view' },
  { to: '/feature-flags', label: 'Feature Flags', permission: 'feature_flags:view' },
  { to: '/fleet', label: 'Fleet', permission: 'fleet:view' },
  { to: '/inspections', label: 'Inspections', permission: 'inspections:view' },
  { to: '/maintenance', label: 'Defects', permission: 'maintenance:view' },
  { to: '/system', label: 'System Health', permission: 'system:view' },
  { to: '/admin-users', label: 'Staff Accounts', permission: 'admin_users:view' },
  { to: '/security', label: 'Security', permission: 'security:view' },
  { to: '/platform-settings', label: 'Settings', permission: 'system:view' },
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
  // Mobile navigation drawer (Round 3 High): the sidebar is static from `md` up,
  // and a slide-in drawer below it, so the whole ops console is usable on a phone.
  const [navOpen, setNavOpen] = useState(false);
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
      if (e.key === 'Escape') setNavOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  const sidebarContent = (
    <>
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
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Static sidebar (md and up) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-(--border-subtle) bg-(--surface-1) p-4 md:flex">
        {sidebarContent}
      </aside>

      {/* Mobile drawer + backdrop (below md) */}
      {navOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setNavOpen(false)} aria-hidden />
          <aside
            className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-(--border-subtle) bg-(--surface-1) p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-(--border-subtle) bg-(--surface-1) px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNavOpen(true)}
              className="rounded-lg p-1.5 text-(--text-secondary) hover:bg-(--surface-2) hover:text-(--text-primary) md:hidden"
              aria-label="Open navigation menu"
              aria-expanded={navOpen}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <nav className="text-sm text-(--text-secondary)" aria-label="Breadcrumb">
              <span className="text-(--text-tertiary)">Admin</span>
              <span className="mx-2 text-(--text-tertiary)">/</span>
              <span className="font-medium text-(--text-primary)">{sectionLabel(location.pathname)}</span>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-(--border-subtle) bg-(--surface-2) px-3 py-1.5 text-sm text-(--text-secondary) hover:text-(--text-primary)"
            >
              <span className="hidden sm:inline">Search…</span>
              <span className="sm:hidden" aria-hidden>🔍</span>
              <kbd className="hidden rounded bg-(--surface-1) px-1.5 py-0.5 text-xs text-(--text-tertiary) sm:inline">⌘K</kbd>
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
          <div className="mx-auto max-w-6xl p-4 md:p-6">{children}</div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
