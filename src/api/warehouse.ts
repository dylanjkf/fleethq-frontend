import { apiClient } from './client';
import type { ListParams } from './types';

export type MachineStatus = 'OPERATIONAL' | 'NEEDS_ATTENTION' | 'DOWN';
export type LogKind = 'SERVICE' | 'REPAIR' | 'READING' | 'NOTE';

export interface StockItem {
  id: string;
  sku: string | null;
  name: string;
  description: string | null;
  category: string | null;
  quantity: number;
  unit: string | null;
  location: string | null;
  minQuantity: number | null;
  attributes: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface StockList {
  items: StockItem[];
  total: number;
  categories: string[];
  lowStockCount: number;
  page: number;
  pageSize: number;
}

export interface WarehouseMachine {
  id: string;
  name: string;
  machineType: string | null;
  serialNumber: string | null;
  status: MachineStatus;
  location: string | null;
  notes: string | null;
  attributes: Record<string, unknown> | null;
  lastServiceAt: string | null;
  nextServiceDueAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  _count?: { logs: number };
}

export interface MachineList {
  items: WarehouseMachine[];
  total: number;
  needsAttentionCount: number;
  page: number;
  pageSize: number;
}

export interface MachineLog {
  id: string;
  machineId: string;
  kind: LogKind;
  summary: string;
  meterValue: number | null;
  meterUnit: string | null;
  occurredAt: string;
  createdByUser: { id: string; fullName: string } | null;
}

export interface StockInput {
  name: string;
  sku?: string;
  description?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  location?: string;
  minQuantity?: number;
  attributes?: Record<string, unknown>;
}

export interface MachineInput {
  name: string;
  machineType?: string;
  serialNumber?: string;
  status?: MachineStatus;
  location?: string;
  notes?: string;
  attributes?: Record<string, unknown>;
  lastServiceAt?: string;
  nextServiceDueAt?: string;
}

// --- Stock ---
export async function listStock(
  params: ListParams & { category?: string; search?: string; lowStock?: string } = {},
): Promise<StockList> {
  const { data } = await apiClient.get<StockList>('/v1/warehouse/stock', { params });
  return data;
}
export async function createStock(input: StockInput): Promise<StockItem> {
  const { data } = await apiClient.post<StockItem>('/v1/warehouse/stock', input);
  return data;
}
export async function updateStock(id: string, input: Partial<StockInput>): Promise<StockItem> {
  const { data } = await apiClient.patch<StockItem>(`/v1/warehouse/stock/${id}`, input);
  return data;
}
export async function adjustStock(id: string, delta: number, reason?: string): Promise<StockItem> {
  const { data } = await apiClient.post<StockItem>(`/v1/warehouse/stock/${id}/adjust`, { delta, reason });
  return data;
}
export async function archiveStock(id: string): Promise<StockItem> {
  const { data } = await apiClient.post<StockItem>(`/v1/warehouse/stock/${id}/archive`);
  return data;
}
export interface StockAdjustment {
  id: string;
  delta: number;
  quantityAfter: number;
  reason: string | null;
  createdAt: string;
  actorUser: { id: string; fullName: string } | null;
}
export async function listStockAdjustments(id: string): Promise<{ items: StockAdjustment[] }> {
  const { data } = await apiClient.get<{ items: StockAdjustment[] }>(`/v1/warehouse/stock/${id}/adjustments`);
  return data;
}
export interface ImportResult {
  created: number;
  failed: number;
  total: number;
  errors: { index: number; message: string }[];
}
export async function importStock(rows: StockInput[]): Promise<ImportResult> {
  const { data } = await apiClient.post<ImportResult>('/v1/warehouse/stock/import', { rows });
  return data;
}

// --- Machines ---
export async function listMachines(
  params: ListParams & { status?: MachineStatus; search?: string } = {},
): Promise<MachineList> {
  const { data } = await apiClient.get<MachineList>('/v1/warehouse/machines', { params });
  return data;
}
export async function createMachine(input: MachineInput): Promise<WarehouseMachine> {
  const { data } = await apiClient.post<WarehouseMachine>('/v1/warehouse/machines', input);
  return data;
}
export async function updateMachine(id: string, input: Partial<MachineInput>): Promise<WarehouseMachine> {
  const { data } = await apiClient.patch<WarehouseMachine>(`/v1/warehouse/machines/${id}`, input);
  return data;
}
export async function archiveMachine(id: string): Promise<WarehouseMachine> {
  const { data } = await apiClient.post<WarehouseMachine>(`/v1/warehouse/machines/${id}/archive`);
  return data;
}
export async function listMachineLogs(id: string): Promise<{ items: MachineLog[] }> {
  const { data } = await apiClient.get<{ items: MachineLog[] }>(`/v1/warehouse/machines/${id}/logs`);
  return data;
}
export async function addMachineLog(
  id: string,
  input: { kind: LogKind; summary: string; meterValue?: number; meterUnit?: string; occurredAt?: string },
): Promise<MachineLog> {
  const { data } = await apiClient.post<MachineLog>(`/v1/warehouse/machines/${id}/logs`, input);
  return data;
}

// --- Machine maintenance schedules (savable/deployable plans) ---
export type PlanStatus = 'ok' | 'due_soon' | 'overdue';

export interface MachinePlan {
  id: string;
  machineId: string;
  machine?: { id: string; name: string };
  label: string;
  intervalDays: number;
  lastServiceAt: string | null;
  nextDueAt: string;
  daysUntilDue: number;
  status: PlanStatus;
}

export async function listMachinePlans(machineId: string): Promise<{ items: MachinePlan[] }> {
  const { data } = await apiClient.get(`/v1/warehouse/machines/${machineId}/plans`);
  return data;
}
export async function createMachinePlan(machineId: string, input: { label: string; intervalDays: number; lastServiceAt?: string }): Promise<MachinePlan> {
  const { data } = await apiClient.post(`/v1/warehouse/machines/${machineId}/plans`, input);
  return data;
}
export async function markMachinePlanServiced(id: string): Promise<MachinePlan> {
  const { data } = await apiClient.post(`/v1/warehouse/machine-plans/${id}/service`);
  return data;
}
export async function archiveMachinePlan(id: string): Promise<MachinePlan> {
  const { data } = await apiClient.post(`/v1/warehouse/machine-plans/${id}/archive`);
  return data;
}
export async function copyMachineScheduleTo(machineId: string, targetMachineIds: string[]): Promise<{ machinesTargeted: number; plansCreated: number; plansRevived: number }> {
  const { data } = await apiClient.post(`/v1/warehouse/machines/${machineId}/plans/copy-to`, { targetMachineIds });
  return data;
}
