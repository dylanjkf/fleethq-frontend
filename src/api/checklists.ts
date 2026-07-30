import { apiClient } from './client';
import type {
  AssetClassKey,
  ChecklistItem,
  ChecklistStatusToday,
  ChecklistSubmission,
  ChecklistTemplate,
  ListParams,
  Paginated,
} from './types';

export interface ChecklistTemplateInput {
  name: string;
  appliesToAssetClass?: AssetClassKey;
  /** Specific assets this template is assigned to (applies every day, on top of the class rule). */
  assignedAssetIds?: string[];
  items: ChecklistItem[];
}

export async function listChecklistTemplates(
  params: ListParams = {},
): Promise<Paginated<ChecklistTemplate>> {
  const { data } = await apiClient.get<Paginated<ChecklistTemplate>>('/v1/checklist-templates', { params });
  return data;
}

export async function createChecklistTemplate(input: ChecklistTemplateInput): Promise<ChecklistTemplate> {
  const { data } = await apiClient.post<ChecklistTemplate>('/v1/checklist-templates', input);
  return data;
}

export async function updateChecklistTemplate(
  id: string,
  input: Partial<ChecklistTemplateInput>,
): Promise<ChecklistTemplate> {
  const { data } = await apiClient.patch<ChecklistTemplate>(`/v1/checklist-templates/${id}`, input);
  return data;
}

export async function archiveChecklistTemplate(id: string): Promise<ChecklistTemplate> {
  const { data } = await apiClient.post<ChecklistTemplate>(`/v1/checklist-templates/${id}/archive`);
  return data;
}

export async function listChecklistSubmissions(
  params: ListParams & { assetId?: string } = {},
): Promise<Paginated<ChecklistSubmission>> {
  const { data } = await apiClient.get<Paginated<ChecklistSubmission>>('/v1/checklist-submissions', { params });
  return data;
}

export async function getChecklistStatusToday(): Promise<ChecklistStatusToday> {
  const { data } = await apiClient.get<ChecklistStatusToday>('/v1/checklist-status/today');
  return data;
}
