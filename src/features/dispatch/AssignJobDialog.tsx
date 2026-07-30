import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { listAssets } from '@/api/assets';
import { listOperators } from '@/api/operators';
import { listDepots } from '@/api/depots';
import { getOperatorFatigueStatus } from '@/api/fatigue';
import { listMaintenanceJobs } from '@/api/maintenance';
import { getAssetRecommendations } from '@/api/operational-recommendations';
import type { AssignJobInput } from '@/api/dispatch';
import type { Job } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

const UNASSIGNED_VALUE = '__unassigned__';

interface AssignJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: Job;
  onSubmit: (values: AssignJobInput) => Promise<void>;
  isSubmitting: boolean;
}

export function AssignJobDialog({ open, onOpenChange, job, onSubmit, isSubmitting }: AssignJobDialogProps) {
  const { can } = usePermissions();
  const [assetId, setAssetId] = useState(UNASSIGNED_VALUE);
  const [operatorId, setOperatorId] = useState(UNASSIGNED_VALUE);
  const [pickupDepotId, setPickupDepotId] = useState(UNASSIGNED_VALUE);
  const [acknowledgeFatigueRisk, setAcknowledgeFatigueRisk] = useState(false);

  const assetsQuery = useQuery({
    queryKey: ['assets', 'list', 'for-assign'],
    queryFn: () => listAssets({ pageSize: 200 }),
    enabled: open,
  });
  const operatorsQuery = useQuery({
    queryKey: ['operators', 'list', 'for-assign'],
    queryFn: () => listOperators({ pageSize: 200 }),
    enabled: open,
  });
  const depotsQuery = useQuery({
    queryKey: ['depots', 'list', 'for-assign'],
    queryFn: () => listDepots({ pageSize: 200 }),
    enabled: open,
  });
  // Dispatch_Overview.md acceptance criterion: an asset with an open
  // maintenance fault is visibly flagged before it's assigned new work. Read
  // model only — no coupling in the API between Dispatch and Maintenance.
  const maintenanceQuery = useQuery({
    queryKey: ['maintenance-jobs', 'list', 'for-assign'],
    queryFn: () => listMaintenanceJobs({ pageSize: 200 }),
    enabled: open && can(PERMISSIONS.MAINTENANCE_VIEW),
  });
  const inMaintenanceAssetIds = new Set(
    (maintenanceQuery.data?.items ?? [])
      .filter((j) => j.status !== 'COMPLETE')
      .map((j) => j.assetId),
  );

  // 09-AI/Fleet_Intelligence_Overview.md's "operational recommendations" line:
  // rank assets by a deterministic score (open maintenance, compliance expiry),
  // minus a penalty if already tied up on another open job. A suggestion only —
  // the dispatcher can still pick any asset from the list.
  const recommendationsQuery = useQuery({
    queryKey: ['operational-recommendations', 'assets-for-job', job?.id],
    queryFn: () => getAssetRecommendations(job?.id),
    enabled: open && can(PERMISSIONS.DISPATCH_VIEW),
  });
  const recommendationsByAssetId = new Map((recommendationsQuery.data ?? []).map((r) => [r.assetId, r]));
  const topRecommendedAssetId = recommendationsQuery.data?.find((r) => !r.isBusy)?.assetId;

  // 08-Compliance/Australian_Compliance.md's fatigue edge case: a dispatcher
  // can still knowingly assign a flagged operator (that's their legal call,
  // not the software's to block), but only after explicitly acknowledging
  // it — the checkbox below, sent as `acknowledgeFatigueRisk`. Checked
  // against the currently-selected operator on every open/change, matching
  // the server (which re-checks on every assign call, not just a changed
  // operator, since time passing can turn an ok operator into a risky one).
  const fatigueQuery = useQuery({
    queryKey: ['fatigue', 'operator', operatorId],
    queryFn: () => getOperatorFatigueStatus(operatorId),
    enabled: open && operatorId !== UNASSIGNED_VALUE && can(PERMISSIONS.COMPLIANCE_VIEW),
  });
  const fatigueStatus = fatigueQuery.data;
  const hasFatigueRisk = !!fatigueStatus && (fatigueStatus.status === 'breach' || fatigueStatus.status === 'approaching_limit');

  useEffect(() => {
    if (open) {
      setAssetId(job?.assetId ?? UNASSIGNED_VALUE);
      setOperatorId(job?.operatorId ?? UNASSIGNED_VALUE);
      setPickupDepotId(job?.pickupDepotId ?? UNASSIGNED_VALUE);
      setAcknowledgeFatigueRisk(false);
    }
  }, [open, job]);

  useEffect(() => {
    setAcknowledgeFatigueRisk(false);
  }, [operatorId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({
      assetId: assetId === UNASSIGNED_VALUE ? null : assetId,
      operatorId: operatorId === UNASSIGNED_VALUE ? null : operatorId,
      pickupDepotId: pickupDepotId === UNASSIGNED_VALUE ? null : pickupDepotId,
      acknowledgeFatigueRisk: hasFatigueRisk ? acknowledgeFatigueRisk : undefined,
      // Optimistic-concurrency token: the version this dialog opened on. If the
      // job moved on since (another dispatcher, or a driver), the assign is
      // rejected as JOB_MODIFIED instead of clobbering the newer state.
      expectedUpdatedAt: job?.updatedAt,
    });
    onOpenChange(false);
  }

  const assets = (assetsQuery.data?.items ?? [])
    .filter((a) => !a.archivedAt)
    .slice()
    .sort((a, b) => (recommendationsByAssetId.get(b.id)?.score ?? 0) - (recommendationsByAssetId.get(a.id)?.score ?? 0));
  const operators = (operatorsQuery.data?.items ?? []).filter((o) => !o.archivedAt);
  const depots = (depotsQuery.data?.items ?? []).filter((d) => !d.archivedAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign "{job?.title}"</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Asset</Label>
            <Select value={assetId} onValueChange={setAssetId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED_VALUE}>— Unassigned —</SelectItem>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    <span className="flex items-center gap-1.5">
                      {asset.name}
                      {asset.id === topRecommendedAssetId && (
                        <Sparkles className="h-3.5 w-3.5 text-accent-500" />
                      )}
                      {inMaintenanceAssetIds.has(asset.id) && (
                        <AlertTriangle className="h-3.5 w-3.5 text-warning-500" />
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {assetId !== UNASSIGNED_VALUE && assetId === topRecommendedAssetId && (
              <p className="flex items-center gap-1.5 text-xs text-accent-500">
                <Sparkles className="h-3.5 w-3.5" /> Suggested — best available match for this job.
              </p>
            )}
            {assetId !== UNASSIGNED_VALUE && inMaintenanceAssetIds.has(assetId) && (
              <p className="flex items-center gap-1.5 text-xs text-warning-500">
                <AlertTriangle className="h-3.5 w-3.5" /> This asset has an open maintenance job.
              </p>
            )}
            {assetId !== UNASSIGNED_VALUE && recommendationsByAssetId.get(assetId)?.isBusy && (
              <p className="flex items-center gap-1.5 text-xs text-(--text-tertiary)">
                Already assigned to another open job.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Operator</Label>
            <Select value={operatorId} onValueChange={setOperatorId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED_VALUE}>— Unassigned —</SelectItem>
                {operators.map((operator) => (
                  <SelectItem key={operator.id} value={operator.id}>
                    {operator.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFatigueRisk && fatigueStatus && (
              <div className="space-y-2 rounded-md border border-warning-500/40 bg-warning-500/10 p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-warning-500">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {fatigueStatus.status === 'breach' ? 'In breach of' : 'Approaching'} a Standard Hours limit
                </p>
                {[...fatigueStatus.breaches, ...fatigueStatus.approaching].map((flag) => (
                  <p key={flag.rule} className="text-xs text-(--text-secondary)">
                    {flag.message}
                  </p>
                ))}
                <label className="flex cursor-pointer items-start gap-2 text-xs text-(--text-primary)">
                  <Checkbox checked={acknowledgeFatigueRisk} onCheckedChange={(v) => setAcknowledgeFatigueRisk(v === true)} />
                  I acknowledge this risk and want to assign this operator anyway.
                </label>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Pickup depot</Label>
            <Select value={pickupDepotId} onValueChange={setPickupDepotId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED_VALUE}>— No pickup depot —</SelectItem>
                {depots.map((depot) => (
                  <SelectItem key={depot.id} value={depot.id}>
                    {depot.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || (hasFatigueRisk && !acknowledgeFatigueRisk)}>
              {isSubmitting ? 'Saving…' : 'Save assignment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
