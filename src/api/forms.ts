import { apiClient } from './client';
import type { FormAnswer, FormField, FormSubmission, FormTargetContext, FormTemplate, ListParams, Paginated } from './types';

export interface FormTemplateInput {
  name: string;
  description?: string;
  targetContext?: FormTargetContext;
  fields: FormField[];
  /** `null` detaches an attached reference document. */
  referenceDocumentId?: string | null;
}

export async function listFormTemplates(
  params: ListParams & { targetContext?: FormTargetContext } = {},
): Promise<Paginated<FormTemplate>> {
  const { data } = await apiClient.get<Paginated<FormTemplate>>('/v1/form-templates', { params });
  return data;
}

export async function createFormTemplate(input: FormTemplateInput): Promise<FormTemplate> {
  const { data } = await apiClient.post<FormTemplate>('/v1/form-templates', input);
  return data;
}

export async function updateFormTemplate(id: string, input: Partial<FormTemplateInput>): Promise<FormTemplate> {
  const { data } = await apiClient.patch<FormTemplate>(`/v1/form-templates/${id}`, input);
  return data;
}

export async function archiveFormTemplate(id: string): Promise<FormTemplate> {
  const { data } = await apiClient.post<FormTemplate>(`/v1/form-templates/${id}/archive`);
  return data;
}

export async function listFormSubmissions(
  params: ListParams & { templateId?: string } = {},
): Promise<Paginated<FormSubmission>> {
  const { data } = await apiClient.get<Paginated<FormSubmission>>('/v1/form-submissions', { params });
  return data;
}

export interface SubmitFormInput {
  templateId: string;
  templateVersion: number;
  /** The exact fields shown, so the record stays faithful to a later template edit. */
  templateSnapshot: FormField[];
  answers: FormAnswer[];
}

/** Complete and submit an office (FleetHQ) form. Requires `forms:submit`. */
export async function submitForm(input: SubmitFormInput): Promise<FormSubmission> {
  const { data } = await apiClient.post<FormSubmission>('/v1/form-submissions', input);
  return data;
}

/**
 * Opens a template's reference document. Served from the form's own route, so
 * `forms:view` is enough — see the API's rationale.
 */
export async function openFormReferenceDocument(id: string): Promise<void> {
  const { data } = await apiClient.get<Blob>(`/v1/form-templates/${id}/reference`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
