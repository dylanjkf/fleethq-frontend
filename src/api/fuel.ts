import { apiClient } from './client';
import type { ListParams, Paginated } from './types';

export interface FuelEntry {
  id: string;
  odometerReading: number;
  licencePlate: string;
  /** Only ever the last 4 digits — a full card number is never stored. */
  cardLast4: string;
  litres: string | null;
  totalCost: string | null;
  filledAt: string;
  notes: string | null;
  asset: { id: string; name: string; registration: string | null } | null;
  operator: { id: string; fullName: string } | null;
  receiptAttachment: { id: string; filename: string; contentType: string; byteSize: number } | null;
}

export interface FuelSummary {
  entryCount: number;
  /** Decimal strings from Postgres NUMERIC — parsed at the display edge. */
  totalCost: string | null;
  totalLitres: string | null;
}

export async function listFuelEntries(params: ListParams & { assetId?: string } = {}): Promise<Paginated<FuelEntry>> {
  const { data } = await apiClient.get<Paginated<FuelEntry>>('/v1/fuel/entries', { params });
  return data;
}

export async function getFuelSummary(): Promise<FuelSummary> {
  const { data } = await apiClient.get<FuelSummary>('/v1/fuel/summary');
  return data;
}
