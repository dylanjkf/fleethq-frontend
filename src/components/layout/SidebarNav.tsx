import { NavLink } from 'react-router';
import { NAV_ITEMS } from '@/app/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/cn';

interface SidebarNavProps {
  /** Called after a nav link is chosen — the mobile Drawer uses it to close itself. */
  onNavigate?: () => void;
}

/**
 * The permission-filtered primary nav list, shared by the desktop {@link Sidebar}
 * and the mobile nav Drawer (opened from the Topbar) so both render identical
 * items, in the same order, gated by the same permissions.
 */
export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const { canAny } = usePermissions();

  const visibleItems = NAV_ITEMS.filter((item) => !item.permissions || canAny(item.permissions));

  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
      {visibleItems.map((item) => {
        const Icon = item.icon;

        if (item.status === 'coming-soon') {
          return (
            <div
              key={item.path}
              className="flex cursor-not-allowed items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm text-(--text-tertiary) opacity-60"
              title="Coming soon"
            >
              <span className="flex items-center gap-2.5">
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
              <span className="rounded-full bg-(--surface-2) px-1.5 py-0.5 text-[10px] font-medium">Soon</span>
            </div>
          );
        }

        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all duration-200 [transition-timing-function:var(--ease-out-soft)]',
                isActive
                  ? 'bg-accent-500/10 text-accent-600 dark:text-accent-200'
                  : 'text-(--text-secondary) hover:bg-(--surface-2) hover:text-(--text-primary)',
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Active accent rail. */}
                <span
                  className={cn(
                    'absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent-500 transition-opacity duration-200',
                    isActive ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <Icon
                  className={cn(
                    'h-4 w-4 transition-transform duration-200 [transition-timing-function:var(--ease-out-soft)]',
                    isActive ? 'text-accent-500' : 'group-hover:scale-110',
                  )}
                />
                {item.label}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
