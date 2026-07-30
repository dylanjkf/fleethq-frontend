import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { CommandPalette } from '@/components/layout/CommandPalette';

/** Shown briefly while a code-split route chunk loads. */
function RouteFallback() {
  return (
    <div className="flex h-full items-center justify-center py-24">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
    </div>
  );
}

/**
 * The shell every authenticated page renders inside. Adding a new page is a
 * route + a nav entry (see app/navigation.ts) — this file never changes.
 */
export function AppShell() {
  return (
    <div className="app-surface flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
