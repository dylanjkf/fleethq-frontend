import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { listNotifications, markAllNotificationsRead, markNotificationRead, type NotificationList } from '@/api/notifications';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NOTIFICATIONS_KEY = ['notifications'];

/** The office notifications bell — unread badge, list, mark-read, and deep-link. */
export function NotificationsBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: listNotifications,
    refetchInterval: 20_000,
  });

  // Optimistically clear the unread dot/badge the instant it's tapped, then
  // reconcile against the server onSettled (and roll the cache back onError).
  const readOne = useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const previous = queryClient.getQueryData<NotificationList>(NOTIFICATIONS_KEY);
      queryClient.setQueryData<NotificationList>(NOTIFICATIONS_KEY, (old) => {
        if (!old) return old;
        const now = new Date().toISOString();
        const items = old.items.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: now } : n));
        return { items, unreadCount: items.filter((n) => !n.readAt).length };
      });
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(NOTIFICATIONS_KEY, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
  const readAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const previous = queryClient.getQueryData<NotificationList>(NOTIFICATIONS_KEY);
      queryClient.setQueryData<NotificationList>(NOTIFICATIONS_KEY, (old) => {
        if (!old) return old;
        const now = new Date().toISOString();
        return { items: old.items.map((n) => (n.readAt ? n : { ...n, readAt: now })), unreadCount: 0 };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(NOTIFICATIONS_KEY, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unread > 0 && (
            <button className="text-xs font-medium text-accent-500" onClick={() => readAll.mutate()}>
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-(--text-tertiary)">You're all caught up.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.readAt) readOne.mutate(n.id);
                  if (n.linkPath) navigate(n.linkPath);
                }}
                className={`flex w-full gap-2 px-3 py-2.5 text-left hover:bg-(--surface-2) ${n.readAt ? '' : 'bg-accent-500/6'}`}
              >
                {!n.readAt && <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-accent-500" />}
                <span className={`min-w-0 flex-1 ${n.readAt ? 'pl-4' : ''}`}>
                  <span className="block truncate text-sm font-medium">{n.title}</span>
                  {n.body && <span className="block truncate text-xs text-(--text-tertiary)">{n.body}</span>}
                  <span className="block text-[11px] text-(--text-tertiary)">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
