import { apiClient } from './client';

export interface OperationsReport {
  range: { from: string; to: string };
  deliveries: {
    total: number;
    delivered: number;
    failed: number;
    deliveryRatePct: number | null;
    onTime: { assessed: number; onTimeCount: number; lateCount: number; onTimeRatePct: number | null };
  };
  failureReasons: { reason: string; count: number }[];
  checklists: { completed: number; withFailures: number };
  workshop: { openJobs: number };
  byOperator: { operatorId: string | null; name: string; delivered: number; failed: number; checklists: number }[];
  cost: {
    totalCost: number;
    jobsWithCost: number;
    averageCostPerJob: number | null;
    trend: { date: string; cost: number }[];
  };
  uptime: {
    fleetUptimePct: number | null;
    totalAssets: number;
    assetsWithDowntime: { assetId: string; assetName: string; downtimeHours: number; uptimePct: number }[];
  };
}

export async function getOperationsReport(params: { from?: string; to?: string } = {}): Promise<OperationsReport> {
  const { data } = await apiClient.get<OperationsReport>('/v1/reports/operations', { params });
  return data;
}

export interface ImpactReport {
  range: { from: string; to: string; months: number };
  firstActivityAt: string | null;
  headline: {
    deliveriesProven: number;
    deliveryRatePct: number | null;
    onTimeRatePct: number | null;
    checklistsCompleted: number;
    checklistPassRatePct: number | null;
    faultsTrackedToClosure: number;
    maintenanceCostTracked: number;
    activeOperators: number;
    activeAssets: number;
    failedDeliveries: number;
  };
  series: {
    month: string;
    label: string;
    delivered: number;
    failed: number;
    deliveryRatePct: number | null;
    onTimeRatePct: number | null;
    checklists: number;
    maintenanceCost: number;
  }[];
}

export async function getImpactReport(params: { months?: number } = {}): Promise<ImpactReport> {
  const { data } = await apiClient.get<ImpactReport>('/v1/reports/impact', { params });
  return data;
}
