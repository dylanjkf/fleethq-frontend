import { apiClient } from './client';

export interface FatigueRuleSet {
  id: string;
  name: string;
  isDefault: boolean;
  maxWork24hMin: number;
  minRest24hMin: number;
  maxWork7dMin: number;
  minRest7dMin: number;
  approachingBufferMin: number;
  lookbackDays: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  _count?: { operators: number };
}

export interface FatigueRuleSetInput {
  name: string;
  maxWork24hMin: number;
  minRest24hMin: number;
  maxWork7dMin: number;
  minRest7dMin: number;
  approachingBufferMin: number;
  lookbackDays?: number;
  isDefault?: boolean;
}

export type FatiguePreset = Omit<FatigueRuleSetInput, 'isDefault'>;

export async function listFatigueRuleSets(): Promise<{ items: FatigueRuleSet[] }> {
  const { data } = await apiClient.get<{ items: FatigueRuleSet[] }>('/v1/fatigue-rule-sets');
  return data;
}
export async function getFatiguePreset(): Promise<FatiguePreset> {
  const { data } = await apiClient.get<FatiguePreset>('/v1/fatigue-rule-sets/preset');
  return data;
}
export async function createFatigueRuleSet(input: FatigueRuleSetInput): Promise<FatigueRuleSet> {
  const { data } = await apiClient.post<FatigueRuleSet>('/v1/fatigue-rule-sets', input);
  return data;
}
export async function updateFatigueRuleSet(id: string, input: Partial<FatigueRuleSetInput>): Promise<FatigueRuleSet> {
  const { data } = await apiClient.patch<FatigueRuleSet>(`/v1/fatigue-rule-sets/${id}`, input);
  return data;
}
export async function archiveFatigueRuleSet(id: string): Promise<FatigueRuleSet> {
  const { data } = await apiClient.post<FatigueRuleSet>(`/v1/fatigue-rule-sets/${id}/archive`);
  return data;
}
export async function deployFatigueRuleSet(
  id: string,
  input: { operatorIds?: string[]; setDefault?: boolean },
): Promise<{ assigned: number; setDefault: boolean }> {
  const { data } = await apiClient.post<{ assigned: number; setDefault: boolean }>(`/v1/fatigue-rule-sets/${id}/deploy`, input);
  return data;
}
