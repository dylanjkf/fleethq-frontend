import { apiClient } from './client';
import type { ListParams } from './types';

/**
 * The Integration Hub (10-Integrations/Integration_Hub.md): a generic,
 * plugin-shaped framework for connecting FleetHQ to whatever external system
 * a customer already runs — not bespoke per-vendor clients. Types mirror
 * apps/api/src/integrations exactly.
 */

export type IntegrationConnectorType = 'CSV' | 'REST' | 'WEBHOOK';
export type IntegrationDirection = 'IMPORT' | 'EXPORT' | 'BIDIRECTIONAL';
export type IntegrationAuthType = 'NONE' | 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH' | 'WEBHOOK_SECRET';
export type IntegrationTransform = 'NONE' | 'UPPERCASE' | 'LOWERCASE' | 'TRIM' | 'DATE_FORMAT' | 'UNIT_CONVERSION' | 'DEFAULT_VALUE' | 'LOOKUP_TABLE';
export type IntegrationSyncTrigger = 'MANUAL' | 'SCHEDULED';
export type IntegrationSyncStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'PARTIAL_FAILURE' | 'FAILURE';
export type IntegrationDeadLetterStatus = 'PENDING_RETRY' | 'RETRYING' | 'RESOLVED' | 'DEAD';
export type IntegrationWebhookDirection = 'INCOMING' | 'OUTGOING';

/** The FleetHQ entities a connection can import into — same keys the bulk imports module uses. */
export const TARGET_ENTITIES = ['assets', 'operators', 'depots', 'customers', 'attached_units', 'compliance_documents'] as const;
export type TargetEntity = (typeof TARGET_ENTITIES)[number];

export const TARGET_ENTITY_LABELS: Record<TargetEntity, string> = {
  assets: 'Assets',
  operators: 'Operators',
  depots: 'Depots',
  customers: 'Customers',
  attached_units: 'Attached Units',
  compliance_documents: 'Compliance Documents',
};

/** The FleetHQ fields each target entity's `create` DTO accepts — drives the mapping designer's dropdown. */
export const TARGET_ENTITY_FIELDS: Record<TargetEntity, string[]> = {
  assets: ['name', 'externalReference', 'emergencyContact', 'make', 'model', 'year', 'vin', 'registration', 'odometer', 'odometerUnit', 'assetClass'],
  operators: ['fullName', 'email', 'phone'],
  depots: ['name', 'address', 'notes'],
  customers: ['name', 'address', 'contactName', 'phone', 'notes'],
  attached_units: ['name', 'externalReference', 'make', 'model', 'year', 'vin', 'registration', 'notes'],
  compliance_documents: ['assetId', 'operatorId', 'documentType', 'documentNumber', 'issuedAt', 'expiresAt', 'notes'],
};

/** Never carries encryptedPayload/encryptionIv/encryptionTag — the vault never round-trips a secret. */
export interface IntegrationCredential {
  id: string;
  companyId: string;
  name: string;
  authType: IntegrationAuthType;
  createdAt: string;
  updatedAt: string;
  rotatedAt: string | null;
  archivedAt: string | null;
}

export interface IntegrationConnection {
  id: string;
  companyId: string;
  name: string;
  connectorType: IntegrationConnectorType;
  direction: IntegrationDirection;
  targetEntity: TargetEntity;
  config: Record<string, unknown>;
  credentialId: string | null;
  scheduleCron: string | null;
  isEnabled: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: IntegrationSyncStatus | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface IntegrationConnectionDetail extends IntegrationConnection {
  fieldMappings: IntegrationFieldMapping[];
}

export interface IntegrationFieldMapping {
  id: string;
  companyId: string;
  connectionId: string;
  externalField: string;
  fleetField: string;
  transform: IntegrationTransform;
  transformConfig: Record<string, unknown> | null;
  isRequired: boolean;
  order: number;
  createdAt: string;
  archivedAt: string | null;
}

export interface IntegrationSyncRun {
  id: string;
  companyId: string;
  connectionId: string;
  trigger: IntegrationSyncTrigger;
  status: IntegrationSyncStatus;
  triggeredByUserId: string | null;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errorSummary: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface IntegrationDeadLetter {
  id: string;
  companyId: string;
  connectionId: string;
  syncRunId: string | null;
  externalRef: string | null;
  rawPayload: Record<string, unknown>;
  errorMessage: string;
  attempts: number;
  status: IntegrationDeadLetterStatus;
  nextRetryAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationWebhook {
  id: string;
  companyId: string;
  connectionId: string | null;
  name: string;
  direction: IntegrationWebhookDirection;
  targetUrl: string | null;
  inboundToken: string | null;
  secretCredentialId: string | null;
  headerTemplate: Record<string, string> | null;
  isEnabled: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
  archivedAt: string | null;
}

export interface IntegrationWebhookDelivery {
  id: string;
  companyId: string;
  webhookId: string;
  direction: IntegrationWebhookDirection;
  requestPayload: Record<string, unknown> | null;
  responseStatus: number | null;
  success: boolean;
  attempt: number;
  errorMessage: string | null;
  createdAt: string;
}

export interface IntegrationDashboard {
  totalConnections: number;
  connectionsByHealth: Record<string, number>;
  pendingDeadLetters: number;
  deadDeadLetters: number;
  recentRuns: IntegrationSyncRun[];
}

// ---- Credentials --------------------------------------------------------------

export interface CreateCredentialInput {
  name: string;
  authType: IntegrationAuthType;
  secretValue?: string;
}
export interface UpdateCredentialInput {
  name?: string;
  secretValue?: string;
}

export async function listCredentials(params: ListParams = {}): Promise<{ items: IntegrationCredential[] }> {
  const { data } = await apiClient.get('/v1/integrations/credentials', { params });
  return data;
}
export async function createCredential(input: CreateCredentialInput): Promise<IntegrationCredential> {
  const { data } = await apiClient.post('/v1/integrations/credentials', input);
  return data;
}
export async function updateCredential(id: string, input: UpdateCredentialInput): Promise<IntegrationCredential> {
  const { data } = await apiClient.patch(`/v1/integrations/credentials/${id}`, input);
  return data;
}
export async function archiveCredential(id: string): Promise<IntegrationCredential> {
  const { data } = await apiClient.post(`/v1/integrations/credentials/${id}/archive`);
  return data;
}
export async function testCredential(id: string): Promise<{ ok: boolean; message: string }> {
  const { data } = await apiClient.post(`/v1/integrations/credentials/${id}/test`);
  return data;
}

// ---- Connections --------------------------------------------------------------

export interface CreateConnectionInput {
  name: string;
  connectorType: IntegrationConnectorType;
  direction: IntegrationDirection;
  targetEntity: TargetEntity;
  config: Record<string, unknown>;
  credentialId?: string;
  scheduleCron?: string;
  isEnabled?: boolean;
}
export type UpdateConnectionInput = Partial<CreateConnectionInput>;

export async function listConnections(params: ListParams = {}): Promise<{ items: IntegrationConnection[] }> {
  const { data } = await apiClient.get('/v1/integrations/connections', { params });
  return data;
}
export async function getConnection(id: string): Promise<IntegrationConnectionDetail> {
  const { data } = await apiClient.get(`/v1/integrations/connections/${id}`);
  return data;
}
export async function createConnection(input: CreateConnectionInput): Promise<IntegrationConnection> {
  const { data } = await apiClient.post('/v1/integrations/connections', input);
  return data;
}
export async function updateConnection(id: string, input: UpdateConnectionInput): Promise<IntegrationConnection> {
  const { data } = await apiClient.patch(`/v1/integrations/connections/${id}`, input);
  return data;
}
export async function archiveConnection(id: string): Promise<IntegrationConnection> {
  const { data } = await apiClient.post(`/v1/integrations/connections/${id}/archive`);
  return data;
}

// ---- Field mappings ----------------------------------------------------------

export interface FieldMappingInput {
  externalField: string;
  fleetField: string;
  transform?: IntegrationTransform;
  transformConfig?: Record<string, unknown>;
  isRequired?: boolean;
  order?: number;
}

export async function listFieldMappings(connectionId: string): Promise<{ items: IntegrationFieldMapping[] }> {
  const { data } = await apiClient.get(`/v1/integrations/connections/${connectionId}/field-mappings`);
  return data;
}
export async function createFieldMapping(connectionId: string, input: FieldMappingInput): Promise<IntegrationFieldMapping> {
  const { data } = await apiClient.post(`/v1/integrations/connections/${connectionId}/field-mappings`, input);
  return data;
}
export async function updateFieldMapping(id: string, input: Partial<FieldMappingInput>): Promise<IntegrationFieldMapping> {
  const { data } = await apiClient.patch(`/v1/integrations/field-mappings/${id}`, input);
  return data;
}
export async function archiveFieldMapping(id: string): Promise<IntegrationFieldMapping> {
  const { data } = await apiClient.post(`/v1/integrations/field-mappings/${id}/archive`);
  return data;
}

// ---- Sync -----------------------------------------------------------------------

export async function triggerSync(connectionId: string, rows?: Record<string, unknown>[]): Promise<IntegrationSyncRun> {
  const { data } = await apiClient.post(`/v1/integrations/connections/${connectionId}/sync`, { rows });
  return data;
}
export async function listSyncRuns(connectionId: string, params: ListParams = {}): Promise<{ items: IntegrationSyncRun[]; total: number }> {
  const { data } = await apiClient.get(`/v1/integrations/connections/${connectionId}/sync-runs`, { params });
  return data;
}
export async function listDeadLetters(connectionId: string, params: ListParams = {}): Promise<{ items: IntegrationDeadLetter[]; total: number }> {
  const { data } = await apiClient.get(`/v1/integrations/connections/${connectionId}/dead-letters`, { params });
  return data;
}
export async function retryDeadLetter(id: string): Promise<IntegrationDeadLetter> {
  const { data } = await apiClient.post(`/v1/integrations/dead-letters/${id}/retry`);
  return data;
}

export async function getDashboard(): Promise<IntegrationDashboard> {
  const { data } = await apiClient.get('/v1/integrations/dashboard');
  return data;
}

// ---- Webhooks -------------------------------------------------------------------

export interface CreateWebhookInput {
  name: string;
  direction: IntegrationWebhookDirection;
  connectionId?: string;
  targetUrl?: string;
  secretCredentialId?: string;
  headerTemplate?: Record<string, string>;
  isEnabled?: boolean;
}
export type UpdateWebhookInput = Partial<Omit<CreateWebhookInput, 'direction' | 'connectionId'>>;

export async function listWebhooks(params: ListParams = {}): Promise<{ items: IntegrationWebhook[] }> {
  const { data } = await apiClient.get('/v1/integrations/webhooks', { params });
  return data;
}
export async function createWebhook(input: CreateWebhookInput): Promise<IntegrationWebhook> {
  const { data } = await apiClient.post('/v1/integrations/webhooks', input);
  return data;
}
export async function updateWebhook(id: string, input: UpdateWebhookInput): Promise<IntegrationWebhook> {
  const { data } = await apiClient.patch(`/v1/integrations/webhooks/${id}`, input);
  return data;
}
export async function archiveWebhook(id: string): Promise<IntegrationWebhook> {
  const { data } = await apiClient.post(`/v1/integrations/webhooks/${id}/archive`);
  return data;
}
export async function listWebhookDeliveries(id: string): Promise<{ items: IntegrationWebhookDelivery[] }> {
  const { data } = await apiClient.get(`/v1/integrations/webhooks/${id}/deliveries`);
  return data;
}
export type TestWebhookResult = { mode: 'outgoing'; success: boolean; attempts: number } | { mode: 'incoming'; inboundToken: string | null };
export async function testWebhook(id: string): Promise<TestWebhookResult> {
  const { data } = await apiClient.post(`/v1/integrations/webhooks/${id}/test`);
  return data;
}

/** The full inbound URL an external system should POST to — built client-side, never returned by the API. */
export function inboundWebhookUrl(token: string): string {
  return `${window.location.origin}/v1/integrations/webhooks/in/${token}`;
}
