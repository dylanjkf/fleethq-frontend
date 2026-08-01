import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';
import { SidebarNav } from '@/components/layout/SidebarNav';

/**
 * Small-screen navigation. The desktop sidebar is hidden below `md`, so this
 * hamburger + slide-in drawer is the *only* nav on phones/tablets — previously
 * there was none. Reuses the exact grouped SidebarNav, and closes on jump.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        className="flex h-9 w-9 items-center justify-center rounded-md text-(--text-secondary) transition-colors hover:bg-(--surface-2) hover:text-(--text-primary) md:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-fade-in md:hidden" />
        <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-(--border-subtle) bg-(--surface-0) shadow-xl md:hidden">
          <div className="flex h-14 items-center justify-between border-b border-(--border-subtle) px-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent-400 to-accent2-500 text-xs font-bold text-white">
                F
              </span>
              <div className="flex flex-col leading-none">
                <DialogPrimitive.Title className="text-sm font-semibold tracking-tight text-(--text-primary)">
                  FleetHQ
                </DialogPrimitive.Title>
                <span className="eyebrow mt-0.5">Fleet Operations</span>
              </div>
            </div>
            <DialogPrimitive.Close
              className="flex h-8 w-8 items-center justify-center rounded-md text-(--text-tertiary) hover:bg-(--surface-2) hover:text-(--text-primary)"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
