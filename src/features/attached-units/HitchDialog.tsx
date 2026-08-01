import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listAssets } from '@/api/assets';
import type { AttachedUnit } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PickerError } from '@/components/ui/picker-error';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface HitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachedUnit?: AttachedUnit;
  onSubmit: (assetId: string) => Promise<void>;
  isSubmitting: boolean;
}

/** 01-Product/Fleet_Graph.md's PAIRED_WITH workflow: pick which Asset this attached unit hitches to. */
export function HitchDialog({ open, onOpenChange, attachedUnit, onSubmit, isSubmitting }: HitchDialogProps) {
  const [assetId, setAssetId] = useState('');

  const assetsQuery = useQuery({
    queryKey: ['assets', 'list', 'for-hitch'],
    queryFn: () => listAssets({ pageSize: 200 }),
    enabled: open,
  });
  const assets = (assetsQuery.data?.items ?? []).filter((a) => !a.archivedAt);

  useEffect(() => {
    if (open) setAssetId(attachedUnit?.currentAsset?.id ?? '');
  }, [open, attachedUnit]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!assetId) return;
    await onSubmit(assetId);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hitch "{attachedUnit?.name}"</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Asset</Label>
            <Select value={assetId} onValueChange={setAssetId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an asset…" />
              </SelectTrigger>
              <SelectContent>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PickerError query={assetsQuery} noun="assets" />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !assetId}>
              {isSubmitting ? 'Hitching…' : 'Hitch'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
