import { Fragment } from 'react';
import { NavLink } from 'react-router';
import { NAV_GROUP_ORDER, NAV_ITEMS, type NavItem } from '@/app/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/cn';

/**
 * The grouped navigation list, shared verbatim by the desktop sidebar and the
 * mobile drawer so there is exactly one nav implementation. `collapsed` renders
 * the icon-only rail (desktop); `onNavigate` lets the mobile drawer close after
 * a jump.
 */
export function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const { canAny } = usePermissions();

  const visible = NAV_ITEMS.filter((item) => !item.permissions || canAny(item.permissions));
  const grouped = NAV_GROUP_ORDER.map((group) => ({
    group,
    items: visible.filter((item) => item.group === group),
  })).filter((g) => g.items.length > 0);

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3">
      {grouped.map(({ group, items }, index) => (
        <Fragment key={group}>
          {collapsed ? (
            index > 0 && <div className="mx-2 my-2 border-t border-(--border-subtle)" />
          ) : (
            <p className={cn('eyebrow px-3 pb-1.5', index > 0 && 'pt-4')}>{group}</p>
          )}
          <div className="space-y-0.5">
            {items.map((item) => (
              <NavRow key={item.path} item={item} collapsed={collapsed} onNavigate={onNavigate} />
            ))}
          </div>
        </Fragment>
      ))}
    </nav>
  );
}

function NavRow({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  if (item.status === 'coming-soon') {
    return (
      <div
        className={cn(
          'flex cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-(--text-tertiary) opacity-60',
          collapsed && 'justify-center px-0',
        )}
        title={collapsed ? `${item.label} — coming soon` : 'Coming soon'}
      >
        <Icon className="h-[1.05rem] w-[1.05rem] shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            <span className="rounded bg-(--surface-2) px-1.5 py-0.5 text-[10px] font-medium">Soon</span>
          </>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-all duration-200 [transition-timing-function:var(--ease-out-soft)]',
          collapsed && 'justify-center px-0',
          isActive
            ? 'bg-accent-500/10 text-accent-700 dark:text-accent-200'
            : 'text-(--text-secondary) hover:bg-(--surface-2) hover:text-(--text-primary)',
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Active accent rail (hidden when collapsed — the tint carries it). */}
          <span
            className={cn(
              'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-accent-500 transition-opacity duration-200',
              isActive && !collapsed ? 'opacity-100' : 'opacity-0',
            )}
          />
          <Icon
            className={cn(
              'h-[1.05rem] w-[1.05rem] shrink-0 transition-transform duration-200 [transition-timing-function:var(--ease-out-soft)]',
              isActive ? 'text-accent-500' : 'group-hover:scale-110',
            )}
          />
          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  );
}
