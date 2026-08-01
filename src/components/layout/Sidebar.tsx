import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { useSidebarCollapsed } from '@/hooks/useSidebar';
import { cn } from '@/lib/cn';

/**
 * Desktop navigation rail. Grouped sections (see SidebarNav) with a persisted
 * collapse-to-icons mode for power users who want maximum canvas. Hidden below
 * `md` — small screens get the Topbar's drawer instead.
 */
export function Sidebar() {
  const [collapsed, toggle] = useSidebarCollapsed();

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-(--border-subtle) bg-(--surface-0)/70 backdrop-blur-xl transition-[width] duration-200 [transition-timing-function:var(--ease-out-soft)] md:flex',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div
        className={cn(
          'flex h-14 items-center gap-2.5 border-b border-(--border-subtle) px-4',
          collapsed && 'justify-center px-0',
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-accent-400 to-accent2-500 text-xs font-bold text-white shadow-sm">
          F
        </span>
        {!collapsed && (
          <div className="flex flex-1 flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight text-(--text-primary)">FleetHQ</span>
            <span className="eyebrow mt-0.5">Fleet Operations</span>
          </div>
        )}
      </div>

      <SidebarNav collapsed={collapsed} />

      <div className="border-t border-(--border-subtle) p-2">
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-(--text-tertiary) transition-colors hover:bg-(--surface-2) hover:text-(--text-primary)',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-[1.05rem] w-[1.05rem]" />
          ) : (
            <>
              <PanelLeftClose className="h-[1.05rem] w-[1.05rem]" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
