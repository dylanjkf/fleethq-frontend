import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { getCorEvidencePack } from '@/api/cor-evidence';
import { ApiClientError } from '@/api/client';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ComplianceExpiryStatusBadge, MaintenanceStatusBadge } from '@/components/ui/status-badge';

interface CorEvidencePanelProps {
  jobId?: string;
  jobTitle: string;
  onOpenChange: (open: boolean) => void;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--text-tertiary)">{children}</p>;
}

/**
 * 08-Compliance/Australian_Compliance.md's Chain of Responsibility line: a
 * single view assembling this Job's scheduling decisions, its assigned
 * operator's fitness-for-duty signal, and its assigned asset's condition —
 * everything already recorded by normal use (Timeline events, checklist
 * submissions, maintenance faults, compliance documents), read back rather
 * than re-entered into a separate paper process. Opened from Dispatch's row
 * actions, mirroring TimelinePanel/GraphPanel's per-entity drawer shape.
 */
export function CorEvidencePanel({ jobId, jobTitle, onOpenChange }: CorEvidencePanelProps) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['cor-evidence', jobId],
    queryFn: () => getCorEvidencePack(jobId!),
    enabled: !!jobId,
  });

  return (
    <Drawer open={!!jobId} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Chain of Responsibility evidence — {jobTitle}</DrawerTitle>
        </DrawerHeader>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState message={error instanceof ApiClientError ? error.message : 'Could not load the evidence pack.'} onRetry={() => refetch()} />
        ) : !data ? null : (
          <div className="flex-1 space-y-5 overflow-y-auto">
            <div
              className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-medium ${
                data.hasConcerns ? 'border-warning-500/40 bg-warning-500/10 text-warning-500' : 'border-success-500/40 bg-success-500/10 text-success-500'
              }`}
            >
              {data.hasConcerns ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              {data.hasConcerns ? 'This job has one or more flagged concerns below.' : 'No concerns flagged for this job.'}
            </div>

            <div>
              <SectionHeading>Scheduling decisions</SectionHeading>
              {data.schedulingDecisions.length === 0 ? (
                <p className="text-sm text-(--text-tertiary)">No scheduling events recorded.</p>
              ) : (
                <div className="space-y-2">
                  {data.schedulingDecisions.map((e, i) => (
                    <div key={i} className="border-l-2 border-(--border-subtle) pl-3">
                      <p className="text-sm">{e.summary}</p>
                      <p className="text-xs text-(--text-tertiary)">{new Date(e.occurredAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <SectionHeading>Operator fitness for duty</SectionHeading>
              {!data.job.operatorId ? (
                <p className="text-sm text-(--text-tertiary)">No operator was assigned to this job.</p>
              ) : data.operatorFitness.length === 0 ? (
                <p className="text-sm text-(--text-tertiary)">No fatigue breaches or overrides during this job.</p>
              ) : (
                <div className="space-y-2">
                  {data.operatorFitness.map((e, i) => (
                    <div key={i} className="flex items-start gap-1.5 border-l-2 border-warning-500/60 pl-3">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-500" />
                      <div>
                        <p className="text-sm">{e.summary}</p>
                        <p className="text-xs text-(--text-tertiary)">{new Date(e.occurredAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <SectionHeading>Asset condition — pre-start checklists</SectionHeading>
              {!data.job.assetId ? (
                <p className="text-sm text-(--text-tertiary)">No asset was assigned to this job.</p>
              ) : data.assetCondition.checklistSubmissions.length === 0 ? (
                <p className="text-sm text-(--text-tertiary)">No checklists submitted during this job.</p>
              ) : (
                <div className="space-y-2">
                  {data.assetCondition.checklistSubmissions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border border-(--border-subtle) bg-(--surface-1) p-3">
                      <div>
                        <p className="text-sm font-medium">{s.templateName}</p>
                        <p className="text-xs text-(--text-tertiary)">{new Date(s.submittedAt).toLocaleString()}</p>
                      </div>
                      {s.hasFailures && (
                        <span className="flex items-center gap-1 text-xs font-medium text-danger-500">
                          <AlertTriangle className="h-3.5 w-3.5" /> Had failures
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <SectionHeading>Asset condition — maintenance faults</SectionHeading>
              {!data.job.assetId ? (
                <p className="text-sm text-(--text-tertiary)">No asset was assigned to this job.</p>
              ) : data.assetCondition.maintenanceFaults.length === 0 ? (
                <p className="text-sm text-(--text-tertiary)">No open faults during this job.</p>
              ) : (
                <div className="space-y-2">
                  {data.assetCondition.maintenanceFaults.map((m) => (
                    <div key={m.id} className="rounded-lg border border-(--border-subtle) bg-(--surface-1) p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{m.title}</p>
                        <MaintenanceStatusBadge status={m.status} />
                      </div>
                      <p className="text-xs text-(--text-tertiary)">Raised {new Date(m.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <SectionHeading>Asset condition — compliance documents</SectionHeading>
              {!data.job.assetId && !data.job.operatorId ? (
                <p className="text-sm text-(--text-tertiary)">No asset or operator was assigned to this job.</p>
              ) : data.assetCondition.complianceDocuments.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="No documents logged" description="Registration, insurance, or roadworthy documents will appear here." />
              ) : (
                <div className="space-y-2">
                  {data.assetCondition.complianceDocuments.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border border-(--border-subtle) bg-(--surface-1) p-3">
                      <div>
                        <p className="text-sm font-medium">{d.documentType}</p>
                        <p className="text-xs text-(--text-tertiary)">Expires {new Date(d.expiresAt).toLocaleDateString()}</p>
                      </div>
                      <ComplianceExpiryStatusBadge status={d.expiryStatusAtTime} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
