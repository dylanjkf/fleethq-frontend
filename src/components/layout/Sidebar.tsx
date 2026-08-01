import { SidebarNav } from '@/components/layout/SidebarNav';

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-(--border-subtle) bg-(--surface-0)/70 backdrop-blur-xl md:flex">
      <div className="flex h-14 items-center gap-2 px-4">
        {/* Logo mark — a small gradient chip, the one flash of accent up top. */}
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-accent-400 to-accent2-500 text-[11px] font-bold text-white shadow-sm">
          F
        </span>
        <span className="text-sm font-semibold tracking-tight text-(--text-primary)">FleetOS</span>
      </div>
      <SidebarNav />
    </aside>
  );
}
