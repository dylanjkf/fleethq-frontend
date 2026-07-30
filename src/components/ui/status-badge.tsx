import { Badge } from '@/components/ui/badge';
import type { ComplianceExpiryStatus, JobStatus, MaintenanceJobStatus } from '@/api/types';

/**
 * The one place "archived" vs "active" gets rendered — every list page
 * (Assets, Operators, Users, Roles) shares this instead of a bespoke label.
 */
export function ArchivedStatusBadge({ archivedAt }: { archivedAt: string | null }) {
  return archivedAt ? <Badge variant="neutral">Archived</Badge> : <Badge variant="success">Active</Badge>;
}

const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  UNASSIGNED: 'Unassigned',
  ASSIGNED: 'Assigned',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const JOB_STATUS_VARIANT: Record<JobStatus, 'neutral' | 'accent' | 'success' | 'danger'> = {
  UNASSIGNED: 'neutral',
  ASSIGNED: 'accent',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge variant={JOB_STATUS_VARIANT[status]}>{JOB_STATUS_LABEL[status]}</Badge>;
}

const MAINTENANCE_STATUS_LABEL: Record<MaintenanceJobStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  PARTS_PENDING: 'Parts Pending',
  COMPLETE: 'Complete',
};

const MAINTENANCE_STATUS_VARIANT: Record<MaintenanceJobStatus, 'neutral' | 'accent' | 'warning' | 'success'> = {
  OPEN: 'neutral',
  IN_PROGRESS: 'accent',
  PARTS_PENDING: 'warning',
  COMPLETE: 'success',
};

export function MaintenanceStatusBadge({ status }: { status: MaintenanceJobStatus }) {
  return <Badge variant={MAINTENANCE_STATUS_VARIANT[status]}>{MAINTENANCE_STATUS_LABEL[status]}</Badge>;
}

const COMPLIANCE_EXPIRY_LABEL: Record<ComplianceExpiryStatus, string> = {
  valid: 'Valid',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
};

const COMPLIANCE_EXPIRY_VARIANT: Record<ComplianceExpiryStatus, 'success' | 'warning' | 'danger'> = {
  valid: 'success',
  expiring_soon: 'warning',
  expired: 'danger',
};

/** `expiryStatus` is derived by the API from `expiresAt` at read time — never stored. */
export function ComplianceExpiryStatusBadge({ status }: { status: ComplianceExpiryStatus }) {
  return <Badge variant={COMPLIANCE_EXPIRY_VARIANT[status]}>{COMPLIANCE_EXPIRY_LABEL[status]}</Badge>;
}

type AuditOutcome = 'success' | 'failure';

const AUDIT_OUTCOME_LABEL: Record<AuditOutcome, string> = {
  success: 'Success',
  failure: 'Failure',
};

// A failed security event (login failure, permission denied) reads as danger;
// a routine success stays muted so the failures are what draws the eye.
const AUDIT_OUTCOME_VARIANT: Record<AuditOutcome, 'neutral' | 'danger'> = {
  success: 'neutral',
  failure: 'danger',
};

export function AuditOutcomeBadge({ outcome }: { outcome: AuditOutcome }) {
  return <Badge variant={AUDIT_OUTCOME_VARIANT[outcome]}>{AUDIT_OUTCOME_LABEL[outcome]}</Badge>;
}
