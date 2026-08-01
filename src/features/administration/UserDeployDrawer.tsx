import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { listUsers } from '@/api/users';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { PickerError } from '@/components/ui/picker-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { describeApiError } from '@/lib/errors';

/**
 * A reusable "deploy this saved thing to users" drawer — pick company members
 * and apply. Used by notification-preset and dashboard-layout deploys.
 */
export function UserDeployDrawer({
  open,
  title,
  onOpenChange,
  onDeploy,
}: {
  open: boolean;
  title: string;
  onOpenChange: (open: boolean) => void;
  onDeploy: (userIds: string[]) => Promise<{ applied: number }>;
}) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const usersQuery = useQuery({ queryKey: ['users', 'for-deploy'], queryFn: () => listUsers({ pageSize: 200 }), enabled: open });

  const deployM = useMutation({
    mutationFn: () => onDeploy([...selected]),
    onSuccess: (res) => {
      toast({ title: `Applied to ${res.applied} user${res.applied === 1 ? '' : 's'}`, variant: 'success' });
      onOpenChange(false);
      setSelected(new Set());
    },
    onError: (e) => toast({ title: 'Could not deploy', description: describeApiError(e), variant: 'destructive' }),
  });

  const users = (usersQuery.data?.items ?? []).filter((u) => !u.archivedAt);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="overflow-y-auto">
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 space-y-1">
          {usersQuery.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : usersQuery.isError ? (
            <PickerError query={usersQuery} noun="users" />
          ) : users.length === 0 ? (
            <p className="py-4 text-center text-sm text-(--text-tertiary)">No users yet.</p>
          ) : (
            users.map((u) => (
              <label key={u.id} className="flex items-center gap-2 rounded-lg border border-(--border-subtle) px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-accent-500"
                  checked={selected.has(u.userId)}
                  onChange={(e) =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(u.userId);
                      else next.delete(u.userId);
                      return next;
                    })
                  }
                />
                <span className="flex-1">{u.fullName}</span>
                <span className="text-xs text-(--text-tertiary)">{u.role.name}</span>
              </label>
            ))
          )}
        </div>
        <div className="mt-4 flex gap-2 border-t border-(--border-subtle) pt-4">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={deployM.isPending || selected.size === 0} onClick={() => deployM.mutate()}>
            {deployM.isPending ? 'Applying…' : `Apply to ${selected.size || ''}`.trim()}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
