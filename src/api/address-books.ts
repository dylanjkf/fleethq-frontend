import { apiClient } from './client';

export interface AddressBookEntry {
  kind: 'depot' | 'customer';
  name: string;
  address?: string;
  contactName?: string;
  phone?: string;
  notes?: string;
}

export interface AddressBook {
  id: string;
  name: string;
  depotCount: number;
  customerCount: number;
  entries: AddressBookEntry[];
  createdAt: string;
  updatedAt: string;
}

/** The portable payload for transfer between companies. */
export interface AddressBookPayload {
  name: string;
  entries: AddressBookEntry[];
}

export async function listAddressBooks(): Promise<{ items: AddressBook[] }> {
  const { data } = await apiClient.get('/v1/address-books');
  return data;
}
export async function createAddressBook(input: { name: string; includeDepots?: boolean; includeCustomers?: boolean }): Promise<AddressBook> {
  const { data } = await apiClient.post('/v1/address-books', input);
  return data;
}
export async function renameAddressBook(id: string, name: string): Promise<AddressBook> {
  const { data } = await apiClient.patch(`/v1/address-books/${id}`, { name });
  return data;
}
export async function archiveAddressBook(id: string): Promise<AddressBook> {
  const { data } = await apiClient.post(`/v1/address-books/${id}/archive`);
  return data;
}
export async function exportAddressBook(id: string): Promise<AddressBookPayload> {
  const { data } = await apiClient.get(`/v1/address-books/${id}/export`);
  return data;
}
export async function importAddressBook(payload: AddressBookPayload): Promise<AddressBook> {
  const { data } = await apiClient.post('/v1/address-books/import', payload);
  return data;
}
export async function applyAddressBook(id: string): Promise<{ depotsCreated: number; customersCreated: number; skipped: number }> {
  const { data } = await apiClient.post(`/v1/address-books/${id}/apply`);
  return data;
}
