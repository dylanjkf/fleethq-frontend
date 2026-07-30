import { Badge } from '@/components/ui/badge';
import type { IntegrationSyncStatus } from '@/api/integrations';

const LABEL: Record<IntegrationSyncStatus, string> = {
  PENDING: 'Pending',
  RUNNING: 'Running',
  SUCCESS: 'Success',
  PARTIAL_FAILURE: 'Partial failure',
  FAILURE: 'Failure',
};

const VARIANT: Record<IntegrationSyncStatus, 'neutral' | 'accent' | 'success' | 'warning' | 'danger'> = {
  PENDING: 'neutral',
  RUNNING: 'accent',
  SUCCESS: 'success',
  PARTIAL_FAILURE: 'warning',
  FAILURE: 'danger',
};

export function SyncStatusBadge({ status }: { status: IntegrationSyncStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
