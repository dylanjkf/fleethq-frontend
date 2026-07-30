import { apiClient } from './client';

export interface Shift {
  id: string;
  operatorId: string;
  status: 'ACTIVE' | 'ENDED';
  startedAt: string;
  endedAt: string | null;
}

export interface ShiftSummaryRow {
  operatorId: string;
  name: string;
  totalMinutes: number;
  shifts: { id: string; startedAt: string; endedAt: string | null; status: 'ACTIVE' | 'ENDED'; minutes: number }[];
}

export interface ShiftSummary {
  date: string;
  operators: ShiftSummaryRow[];
}

export async function getShiftSummary(params: { date?: string } = {}): Promise<ShiftSummary> {
  const { data } = await apiClient.get<ShiftSummary>('/v1/shifts/summary', { params });
  return data;
}
