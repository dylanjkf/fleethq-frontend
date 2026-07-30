import { Check, Minus, X } from 'lucide-react';
import type { ChecklistAnswerStatus, ChecklistSubmission } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const STATUS_META: Record<ChecklistAnswerStatus, { label: string; className: string; Icon: typeof Check }> = {
  pass: { label: 'Pass', className: 'text-success-500', Icon: Check },
  fail: { label: 'Fail', className: 'text-danger-500', Icon: X },
  na: { label: 'N/A', className: 'text-(--text-tertiary)', Icon: Minus },
};

interface ChecklistSubmissionDetailDialogProps {
  submission?: ChecklistSubmission;
  onOpenChange: (open: boolean) => void;
}

/**
 * Read-only view of a completed checklist exactly as the operator answered it —
 * rendered from the submission's own `templateSnapshot`, not the live template,
 * so it stays faithful even after the office edits the template afterwards.
 */
export function ChecklistSubmissionDetailDialog({ submission, onOpenChange }: ChecklistSubmissionDetailDialogProps) {
  const answerByItemId = new Map((submission?.answers ?? []).map((a) => [a.itemId, a]));

  return (
    <Dialog open={!!submission} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{submission?.template?.name ?? 'Checklist'}</DialogTitle>
        </DialogHeader>
        {submission && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-(--text-secondary)">
              <span>Asset: {submission.asset?.name ?? '—'}</span>
              <span>Operator: {submission.operator?.fullName ?? '—'}</span>
              <span>Submitted: {new Date(submission.submittedAt).toLocaleString()}</span>
              <span>Template v{submission.templateVersion}</span>
            </div>
            <div className="space-y-2">
              {submission.templateSnapshot.map((item) => {
                const answer = answerByItemId.get(item.id);
                // A written-answer item has no pass/fail — show the response text.
                if (item.type === 'text') {
                  return (
                    <div key={item.id} className="rounded-lg border border-(--border-subtle) p-3">
                      <span className="font-medium">{item.label}</span>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-(--text-secondary)">
                        {answer?.note ? answer.note : <span className="text-(--text-tertiary)">No answer</span>}
                      </p>
                    </div>
                  );
                }
                const meta = STATUS_META[answer?.status ?? 'na'];
                const Icon = meta.Icon;
                return (
                  <div key={item.id} className="rounded-lg border border-(--border-subtle) p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{item.label}</span>
                      <span className={`flex items-center gap-1 text-sm font-semibold ${meta.className}`}>
                        <Icon className="h-4 w-4" /> {meta.label}
                      </span>
                    </div>
                    {answer?.note && <p className="mt-1 text-sm text-(--text-tertiary)">Note: {answer.note}</p>}
                  </div>
                );
              })}
            </div>
            {submission.hasFailures && (
              <Badge variant="danger">This checklist recorded one or more failures</Badge>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
