import type { FormSubmission } from '@/api/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—';
  return String(value);
}

interface FormSubmissionDetailDialogProps {
  submission?: FormSubmission;
  onOpenChange: (open: boolean) => void;
}

/**
 * Read-only view of a completed form exactly as it was answered — rendered
 * from the submission's own `templateSnapshot`, not the live template, same
 * "stay faithful even after a later office edit" reasoning as
 * ChecklistSubmissionDetailDialog. Asset/operator reference answers show the
 * raw id rather than a resolved name in this slice — see the entity's own
 * Timeline for the resolved, linked view of this submission.
 */
export function FormSubmissionDetailDialog({ submission, onOpenChange }: FormSubmissionDetailDialogProps) {
  const answerByFieldId = new Map((submission?.answers ?? []).map((a) => [a.fieldId, a.value]));

  return (
    <Dialog open={!!submission} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{submission?.template?.name ?? 'Form submission'}</DialogTitle>
        </DialogHeader>
        {submission && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-(--text-secondary)">
              <span>Submitted by: {submission.submittedByUser?.fullName ?? 'Unknown'}</span>
              <span>Submitted: {new Date(submission.submittedAt).toLocaleString()}</span>
              <span>Template v{submission.templateVersion}</span>
            </div>
            <div className="space-y-2">
              {submission.templateSnapshot.map((field) => (
                <div key={field.id} className="rounded-lg border border-(--border-subtle) p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-(--text-tertiary)">{field.label}</p>
                  <p className="mt-0.5">{formatValue(answerByFieldId.get(field.id))}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
