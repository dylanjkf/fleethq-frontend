import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RoleView } from '@/api/types';
import { PERMISSION_CATALOG, type PermissionKey } from '@/lib/permissions';

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: RoleView;
  onSubmit: (values: { name: string; description?: string; permissionKeys: string[] }) => Promise<void>;
  isSubmitting: boolean;
}

const CATEGORIES = [...new Set(PERMISSION_CATALOG.map((p) => p.category))];

export function RoleFormDialog({ open, onOpenChange, role, onSubmit, isSubmitting }: RoleFormDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Set<PermissionKey>>(new Set());

  useEffect(() => {
    if (open) {
      setName(role?.name ?? '');
      setDescription(role?.description ?? '');
      setSelected(new Set((role?.permissionKeys ?? []) as PermissionKey[]));
    }
  }, [open, role]);

  const grouped = useMemo(
    () => CATEGORIES.map((category) => ({
      category,
      permissions: PERMISSION_CATALOG.filter((p) => p.category === category),
    })),
    [],
  );

  function toggle(key: PermissionKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({ name, description: description || undefined, permissionKeys: [...selected] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{role ? 'Edit role' : 'New role'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="role-name">Name</Label>
              <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-description">Description (optional)</Label>
              <Input id="role-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          <div className="max-h-80 space-y-4 overflow-y-auto rounded-md border border-(--border-subtle) p-3">
            {grouped.map(({ category, permissions }) => (
              <div key={category}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-(--text-tertiary)">
                  {category}
                </p>
                <div className="space-y-1.5">
                  {permissions.map((permission) => (
                    <label key={permission.key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selected.has(permission.key)}
                        onCheckedChange={() => toggle(permission.key)}
                      />
                      {permission.description}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Saving…' : role ? 'Save changes' : 'Create role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
