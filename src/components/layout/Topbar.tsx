import { useNavigate } from 'react-router';
import { LogOut, Monitor, Moon, Search, Settings, Sun, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, initialsFrom } from '@/components/ui/avatar';
import { NotificationsBell } from '@/components/layout/NotificationsBell';
import { Button } from '@/components/ui/button';
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
  const navigate = useNavigate();

  if (!user) return null;

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-(--border-subtle) bg-(--surface-0)/70 px-4 backdrop-blur-xl">
      <button
        type="button"
        onClick={() => setCommandPaletteOpen(true)}
        className="flex w-64 items-center gap-2 rounded-lg border border-(--border-subtle) px-3 py-1.5 text-sm text-(--text-tertiary) transition-colors hover:border-accent-500/40 hover:bg-(--surface-2)"
      >
        <Search className="h-3.5 w-3.5" />
        Search…
        <kbd className="ml-auto rounded border border-(--border-subtle) px-1 text-[10px]">⌘K</kbd>
      </button>

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
