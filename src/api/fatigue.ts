import { apiClient } from './client';
import type { OperatorFatigueStatus } from './types';

export async function getOperatorFatigueStatus(operatorId: string): Promise<OperatorFatigueStatus> {
  const { data } = await apiClient.get<OperatorFatigueStatus>(`/v1/fatigue/operators/${operatorId}`);
  return data;
}

export async function getAtRiskOperators(): Promise<OperatorFatigueStatus[]> {
  const { data } = await apiClient.get<OperatorFatigueStatus[]>('/v1/fatigue/at-risk');
  return data;
}
