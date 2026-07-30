import { apiClient } from './client';
import type { Customer, ListParams, Paginated } from './types';

export interface CreateCustomerInput {
  name: string;
  address?: string;
  contactName?: string;
  phone?: string;
  notes?: string;
}

export type UpdateCustomerInput = Partial<CreateCustomerInput>;

export async function listCustomers(params: ListParams = {}): Promise<Paginated<Customer>> {
  const { data } = await apiClient.get<Paginated<Customer>>('/v1/customers', { params });
  return data;
}

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const { data } = await apiClient.post<Customer>('/v1/customers', input);
  return data;
}

export async function updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer> {
  const { data } = await apiClient.patch<Customer>(`/v1/customers/${id}`, input);
  return data;
}

export async function archiveCustomer(id: string): Promise<Customer> {
  const { data } = await apiClient.post<Customer>(`/v1/customers/${id}/archive`);
  return data;
}

export type StopOutcome = 'PENDING' | 'DELIVERED' | 'FAILED';

export interface CustomerDelivery {
  id: string;
  label: string;
  address: string | null;
  outcome: StopOutcome;
  failureReason: string | null;
  completedAt: string | null;
  recipientName: string | null;
  note: string | null;
  windowEnd: string | null;
  podAttachmentId: string | null;
  signatureAttachmentId: string | null;
  createdAt: string;
  job: { id: string; title: string };
}

export interface CustomerDeliveries {
  summary: { total: number; delivered: number; failed: number; pending: number };
  items: CustomerDelivery[];
}

export async function getCustomerDeliveries(id: string): Promise<CustomerDeliveries> {
  const { data } = await apiClient.get<CustomerDeliveries>(`/v1/customers/${id}/deliveries`);
  return data;
}
