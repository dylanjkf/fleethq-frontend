import { useState } from 'react';
import { useNavigate } from 'react-router';
import { LogOut, Menu, Monitor, Moon, Search, Settings, Sun, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, initialsFrom } from '@/components/ui/avatar';
import { NotificationsBell } from '@/components/layout/NotificationsBell';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useCommandPalette } from '@/hooks/useCommandPalette';

export function Topbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { setOpen: setCommandPaletteOpen } = useCommandPalette();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-(--border-subtle) bg-(--surface-0)/70 px-4 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-2">
        {/* Below md the Sidebar is hidden, so this is the only way to navigate. */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open navigation"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="flex w-40 items-center gap-2 rounded-lg border border-(--border-subtle) px-3 py-1.5 text-sm text-(--text-tertiary) transition-colors hover:border-accent-500/40 hover:bg-(--surface-2) sm:w-64"
        >
          <Search className="h-3.5 w-3.5" />
          Search…
          <kbd className="ml-auto rounded border border-(--border-subtle) px-1 text-[10px]">⌘K</kbd>
        </button>
      </div>

      {/* Mobile nav drawer — the same permission-filtered list the Sidebar renders. */}
      <Drawer open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <DrawerContent className="w-72 max-w-[80vw] p-0">
          <DrawerHeader className="mb-0 flex h-14 items-center gap-2 space-y-0 border-b border-(--border-subtle) px-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-accent-400 to-accent2-500 text-[11px] font-bold text-white shadow-sm">
              F
            </span>
            <DrawerTitle className="text-sm font-semibold tracking-tight">FleetOS</DrawerTitle>
          </DrawerHeader>
          <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
        </DrawerContent>
      </Drawer>

      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-(--text-tertiary) sm:inline">{user.company.name}</span>

        <NotificationsBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Toggle theme">
              <ThemeIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setTheme('light')}>
              <Sun className="mr-2 h-4 w-4" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setTheme('dark')}>
              <Moon className="mr-2 h-4 w-4" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setTheme('system')}>
              <Monitor className="mr-2 h-4 w-4" /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="rounded-full">
              <Avatar>
                <AvatarFallback>{initialsFrom(user.fullName)}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-medium">{user.fullName}</p>
              <p className="font-normal text-(--text-tertiary)">{user.role.name}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate('/profile')}>
              <UserIcon className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={logout}>
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
