import { apiClient } from './client';
import type { StopParcel } from './types';

export type BarcodeScanMode = 'DATABASE_LOOKUP' | 'ENCODED_BARCODE' | 'HYBRID';
export type BarcodeScanOutcome = 'MATCHED' | 'DUPLICATE_BLOCKED' | 'UNKNOWN' | 'MISSING_FIELDS' | 'IGNORED';
export type BarcodeFieldTarget =
  | 'TRACKING_NUMBER'
  | 'CONSIGNMENT_NUMBER'
  | 'MANIFEST_NUMBER'
  | 'INTERNAL_ID'
  | 'CUSTOMER_REFERENCE'
  | 'CUSTOMER'
  | 'DELIVERY_ADDRESS'
  | 'CONTACT'
  | 'DELIVERY_NOTES'
  | 'SERVICE_TYPE'
  | 'PARCEL_COUNT'
  | 'WEIGHT'
  | 'CUBIC'
  | 'DANGEROUS_GOODS'
  | 'CUSTOM_FIELD';

export interface BarcodeScanConfig {
  id: string;
  companyId: string;
  scanMode: BarcodeScanMode;
  allowManualEntry: boolean;
  blockOnMissingFields: boolean;
  requiredFields: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BarcodeSearchableField {
  id: string;
  companyId: string;
  key: string;
  label: string;
  isCustom: boolean;
  order: number;
  createdAt: string;
  archivedAt: string | null;
}

export interface BarcodeFieldMapping {
  id: string;
  companyId: string;
  sourceField: string;
  targetField: BarcodeFieldTarget;
  customFieldKey: string | null;
  isDatabaseLookup: boolean;
  order: number;
  createdAt: string;
  archivedAt: string | null;
}

export interface BarcodeConfigResponse {
  scanConfig: BarcodeScanConfig;
  searchableFields: BarcodeSearchableField[];
  fieldMappings: BarcodeFieldMapping[];
}

export interface BarcodeScanEvent {
  id: string;
  companyId: string | null;
  userId: string | null;
  scannedValue: string;
  scanMode: BarcodeScanMode;
  outcome: BarcodeScanOutcome;
  matchedParcelId: string | null;
  createdAt: string;
}

export interface BarcodeMatchedParcel {
  id: string;
  reference: string;
  stopId: string;
  jobId: string;
  jobTitle: string;
}

export interface BarcodePopulatedFields {
  trackingNumber?: string;
  consignmentNumber?: string;
  manifestNumber?: string;
  internalId?: string;
  customerReference?: string;
  customer?: { id?: string; name: string };
  deliveryAddress?: string;
  contactName?: string;
  deliveryNotes?: string;
  serviceType?: string;
  parcelCount?: number;
  weightKg?: number;
  cubicM3?: number;
  dangerousGoods?: boolean;
  customFields?: Record<string, unknown>;
}

export interface BarcodeScanResult {
  scanEventId: string;
  outcome: BarcodeScanOutcome;
  populatedFields: BarcodePopulatedFields;
  matchedParcel?: BarcodeMatchedParcel;
  missingFields?: string[];
}

export interface ScanFieldsInput {
  reference: string;
  trackingNumber?: string;
  consignmentNumber?: string;
  manifestNumber?: string;
  internalId?: string;
  customerReference?: string;
  deliveryAddress?: string;
  contactName?: string;
  deliveryNotes?: string;
  serviceType?: string;
  parcelCount?: number;
  weightKg?: number;
  cubicM3?: number;
  dangerousGoods?: boolean;
  customFields?: Record<string, unknown>;
}

export async function getBarcodeConfig(): Promise<BarcodeConfigResponse> {
  const { data } = await apiClient.get('/v1/barcode/config');
  return data;
}
export async function updateBarcodeConfig(input: {
  scanMode?: BarcodeScanMode;
  allowManualEntry?: boolean;
  blockOnMissingFields?: boolean;
  requiredFields?: string[];
}): Promise<BarcodeScanConfig> {
  const { data } = await apiClient.patch('/v1/barcode/config', input);
  return data;
}

export async function createSearchableField(input: { key: string; label: string; isCustom?: boolean; order?: number }): Promise<BarcodeSearchableField> {
  const { data } = await apiClient.post('/v1/barcode/searchable-fields', input);
  return data;
}
export async function updateSearchableField(id: string, input: { label?: string; order?: number }): Promise<BarcodeSearchableField> {
  const { data } = await apiClient.patch(`/v1/barcode/searchable-fields/${id}`, input);
  return data;
}
export async function archiveSearchableField(id: string): Promise<BarcodeSearchableField> {
  const { data } = await apiClient.post(`/v1/barcode/searchable-fields/${id}/archive`);
  return data;
}

export async function createFieldMapping(input: {
  sourceField: string;
  targetField: BarcodeFieldTarget;
  customFieldKey?: string;
  isDatabaseLookup?: boolean;
  order?: number;
}): Promise<BarcodeFieldMapping> {
  const { data } = await apiClient.post('/v1/barcode/field-mappings', input);
  return data;
}
export async function updateFieldMapping(
  id: string,
  input: Partial<{ sourceField: string; targetField: BarcodeFieldTarget; customFieldKey: string; isDatabaseLookup: boolean; order: number }>,
): Promise<BarcodeFieldMapping> {
  const { data } = await apiClient.patch(`/v1/barcode/field-mappings/${id}`, input);
  return data;
}
export async function archiveFieldMapping(id: string): Promise<BarcodeFieldMapping> {
  const { data } = await apiClient.post(`/v1/barcode/field-mappings/${id}/archive`);
  return data;
}

export async function scanBarcode(input: { jobId: string; stopId: string; scannedValue: string }): Promise<BarcodeScanResult> {
  const { data } = await apiClient.post('/v1/barcode/scan', input);
  return data;
}
export async function createParcelFromScan(
  scanEventId: string,
  input: { jobId: string; stopId: string; fields: ScanFieldsInput },
): Promise<StopParcel> {
  const { data } = await apiClient.post(`/v1/barcode/scan/${scanEventId}/create`, input);
  return data;
}
export async function getBarcodeScanHistory(limit = 50): Promise<{ items: BarcodeScanEvent[] }> {
  const { data } = await apiClient.get('/v1/barcode/scan-history', { params: { limit } });
  return data;
}
