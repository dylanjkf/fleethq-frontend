/**
 * Types mirror apps/api's actual response shapes exactly (verified by reading
 * the controllers/services directly, not assumed) — see
 * 12-API/API_Architecture.md's error envelope and each resource's DTOs.
 */

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    [key: string]: unknown;
  };
}


export interface ImportRowResult {
  index: number;
  valid: boolean;
  created: boolean;
  errors: string[];
  id?: string;
}

export interface ImportResult {
  total: number;
  validCount: number;
  invalidCount: number;
  createdCount: number;
  dryRun: boolean;
  rows: ImportRowResult[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
  /** Free-text server-side search across the endpoint's relevant columns. */
  search?: string;
}

// Categories are customer-definable, so a key is any string (built-ins are still LAND/AIR/SEA).
export type AssetClassKey = string;

export interface AssetClass {
  id: string;
  key: AssetClassKey;
  name: string;
  isImplemented?: boolean;
}

/** An asset category as returned by GET /v1/asset-classes. */
export interface AssetCategory {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isBuiltIn: boolean;
  /** True when this company removed the category. Only ever set on rows returned with `includeHidden`. */
  isHidden?: boolean;
}

export interface Asset {
  id: string;
  companyId: string;
  assetClassId: string;
  name: string;
  externalReference: string | null;
  emergencyContact: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  registration: string | null;
  odometer: number | null;
  odometerUnit: string | null;
  customFields: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  assetClass: AssetClass;
}

export interface Operator {
  id: string;
  companyId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  /** Set once this Operator has been granted a DriverOS login (link-user). */
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface AttachedUnit {
  id: string;
  companyId: string;
  name: string;
  externalReference: string | null;
  /** Optional structured specs, same shape as Asset's. Null when never filled in. */
  make: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  registration: string | null;
  notes: string | null;
  customFields: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  currentAsset: { id: string; name: string } | null;
}

export type JobStatus = 'UNASSIGNED' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED';

export interface Depot {
  id: string;
  companyId: string;
  name: string;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface Job {
  id: string;
  companyId: string;
  title: string;
  description: string | null;
  assetId: string | null;
  operatorId: string | null;
  pickupDepotId: string | null;
  status: JobStatus;
  scheduledAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Only present on list/get responses, which include the relation — not on mutation responses. */
  asset?: Asset | null;
  operator?: Operator | null;
  pickupDepot?: Depot | null;
  stops?: JobStop[];
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  address: string | null;
  contactName: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export type StopOutcome = 'PENDING' | 'DELIVERED' | 'FAILED';
export type StopFailureReason = 'NOBODY_HOME' | 'ACCESS_DENIED' | 'BUSINESS_CLOSED' | 'ADDRESS_ISSUE' | 'REFUSED' | 'OTHER';

export interface JobStop {
  id: string;
  jobId: string;
  customerId: string | null;
  sequence: number;
  label: string;
  address: string | null;
  contactName: string | null;
  outcome: StopOutcome;
  completedAt: string | null;
  recipientName: string | null;
  note: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  failureReason: StopFailureReason | null;
  reattemptOfStopId: string | null;
  customer?: { id: string; name: string } | null;
  podAttachment?: { id: string; filename: string; contentType: string; byteSize: number } | null;
  signatureAttachment?: { id: string; filename: string; contentType: string; byteSize: number } | null;
  parcels?: StopParcel[];
}

export interface StopParcel {
  id: string;
  reference: string;
  label: string | null;
  scannedAt: string | null;
  trackingNumber?: string | null;
  consignmentNumber?: string | null;
  manifestNumber?: string | null;
  internalId?: string | null;
  customerReference?: string | null;
  deliveryAddress?: string | null;
  contactName?: string | null;
  deliveryNotes?: string | null;
  serviceType?: string | null;
  parcelCount?: number | null;
  weightKg?: number | null;
  cubicM3?: number | null;
  dangerousGoods?: boolean;
  customFields?: Record<string, unknown> | null;
}

export type MaintenanceJobStatus = 'OPEN' | 'IN_PROGRESS' | 'PARTS_PENDING' | 'COMPLETE';

export interface MaintenanceJob {
  id: string;
  companyId: string;
  assetId: string;
  title: string;
  description: string | null;
  status: MaintenanceJobStatus;
  reportedByOperatorId: string | null;
  resolutionNotes: string | null;
  partsCost: number | null;
  laborCost: number | null;
  approvedAt: string | null;
  approvedByUserId: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Only present on list/get responses, which include the relation. */
  asset?: Asset;
  reportedByOperator?: Operator | null;
  partsUsed?: MaintenanceJobPartUsage[];
}

export interface Part {
  id: string;
  companyId: string;
  name: string;
  partNumber: string | null;
  quantityOnHand: number;
  unitCost: number | null;
  lowStockThreshold: number | null;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface MaintenanceJobPartUsage {
  id: string;
  companyId: string;
  maintenanceJobId: string;
  partId: string;
  quantity: number;
  unitCostAtUse: number | null;
  createdAt: string;
  part: Part;
}

export type ComplianceDocumentType = 'REGISTRATION' | 'INSURANCE' | 'ROADWORTHY' | 'LICENCE' | 'MEDICAL_CERTIFICATE';
export type ComplianceExpiryStatus = 'valid' | 'expiring_soon' | 'expired';

export interface ComplianceDocument {
  id: string;
  companyId: string;
  /** Exactly one of assetId/operatorId is set — the server enforces this. */
  assetId: string | null;
  operatorId: string | null;
  documentType: ComplianceDocumentType;
  documentNumber: string | null;
  jurisdiction: string;
  issuedAt: string | null;
  expiresAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  /** Derived at read time by the API, never stored. */
  expiryStatus: ComplianceExpiryStatus;
  /** Only present on list/get responses, which include the relation. */
  asset?: Asset | null;
  operator?: Operator | null;
  fileAttachment?: { id: string; filename: string; contentType: string; byteSize: number } | null;
}

// `text` items take a written answer instead of pass/fail.
export type ChecklistItemType = 'pass_fail' | 'pass_fail_na' | 'text';

export interface ChecklistItem {
  id: string;
  label: string;
  type: ChecklistItemType;
  requireNoteOnFail: boolean;
  createsFaultOnFail: boolean;
}

export interface ChecklistTemplate {
  id: string;
  companyId: string;
  name: string;
  appliesToAssetClassId: string | null;
  version: number;
  items: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  appliesToAssetClass?: AssetClass | null;
  /** Assets this template is directly assigned to (in addition to its class rule). */
  assignments?: { assetId: string }[];
}

export type ChecklistAnswerStatus = 'pass' | 'fail' | 'na';

export interface ChecklistAnswer {
  itemId: string;
  // Absent on a `text` item (its written answer is in `note`).
  status: ChecklistAnswerStatus | null;
  note: string | null;
}

export interface ChecklistSubmission {
  id: string;
  companyId: string;
  templateId: string;
  templateVersion: number;
  templateSnapshot: ChecklistItem[];
  assetId: string;
  operatorId: string | null;
  answers: ChecklistAnswer[];
  hasFailures: boolean;
  startedAt: string | null;
  submittedAt: string;
  template?: { id: string; name: string };
  asset?: { id: string; name: string };
  operator?: { id: string; fullName: string } | null;
}

export interface ChecklistStatusItem {
  asset: { id: string; name: string };
  status: 'done' | 'not_done';
  hasFailures: boolean;
  submittedAt: string | null;
  submissionId: string | null;
  operatorName: string | null;
  templateName: string | null;
}

export interface ChecklistStatusToday {
  date: string;
  summary: { total: number; done: number; notDone: number; withFailures: number };
  items: ChecklistStatusItem[];
}

export type FormFieldType = 'text' | 'number' | 'single_select' | 'multi_select' | 'date' | 'asset_ref' | 'operator_ref';

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options: string[] | null;
  showIfFieldId: string | null;
  showIfValue: string | null;
}

export type FormTargetContext = 'DRIVER' | 'OFFICE' | 'BOTH';

export interface FormTemplate {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  targetContext: FormTargetContext;
  version: number;
  fields: FormField[];
  /** Optional guidance document shown to whoever fills the form in. */
  referenceDocumentId: string | null;
  referenceDocument: {
    id: string;
    title: string;
    fileAttachment: { filename: string; contentType: string; byteSize: number };
  } | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface FormAnswer {
  fieldId: string;
  value: unknown;
}

export interface FormSubmission {
  id: string;
  companyId: string;
  templateId: string;
  templateVersion: number;
  templateSnapshot: FormField[];
  answers: FormAnswer[];
  submittedByUserId: string | null;
  submittedAt: string;
  template?: { id: string; name: string };
  submittedByUser?: { id: string; fullName: string } | null;
}

export type FatigueStatus = 'ok' | 'approaching_limit' | 'breach' | 'not_assessed';

export interface FatigueRuleFlag {
  rule: string;
  label: string;
  message: string;
}

export interface OperatorFatigueStatus {
  operatorId: string;
  operatorName: string;
  status: FatigueStatus;
  ruleSetName: string | null;
  breaches: FatigueRuleFlag[];
  approaching: FatigueRuleFlag[];
  workMinutesLast24h: number;
  longestRestMinutesLast24h: number;
  workMinutesLast7d: number;
  longestRestMinutesLast7d: number;
}

export interface CorSchedulingEvent {
  eventType: string;
  summary: string;
  occurredAt: string;
  actorUserId: string | null;
}

export interface CorOperatorFitnessEvent {
  eventType: string;
  summary: string;
  occurredAt: string;
}

export interface CorChecklistSubmission {
  id: string;
  templateName: string;
  hasFailures: boolean;
  submittedAt: string;
}

export interface CorMaintenanceFault {
  id: string;
  title: string;
  status: MaintenanceJobStatus;
  createdAt: string;
  completedAt: string | null;
}

export interface CorComplianceDocument {
  id: string;
  documentType: ComplianceDocumentType;
  expiresAt: string;
  expiryStatusAtTime: ComplianceExpiryStatus;
}

export interface CorEvidencePack {
  job: {
    id: string;
    title: string;
    status: JobStatus;
    assetId: string | null;
    assetName: string | null;
    operatorId: string | null;
    operatorName: string | null;
    createdAt: string;
    windowEnd: string;
  };
  schedulingDecisions: CorSchedulingEvent[];
  operatorFitness: CorOperatorFitnessEvent[];
  assetCondition: {
    checklistSubmissions: CorChecklistSubmission[];
    maintenanceFaults: CorMaintenanceFault[];
    complianceDocuments: CorComplianceDocument[];
  };
  hasConcerns: boolean;
  generatedAt: string;
}

export type PredictiveSignalType = 'RECURRING_FAULT' | 'SHARED_ATTACHED_UNIT_PATTERN';

export interface PredictiveMaintenanceSignal {
  type: PredictiveSignalType;
  title: string;
  summary: string;
  occurrenceCount: number;
  assetIds: string[];
  assetNames: string[];
  attachedUnitId: string | null;
  attachedUnitName: string | null;
  maintenanceJobIds: string[];
}

export interface AssetRecommendation {
  assetId: string;
  assetName: string;
  score: number;
  isBusy: boolean;
  reasons: string[];
}

export interface MaintenancePriorityItem {
  maintenanceJobId: string;
  assetId: string;
  assetName: string;
  title: string;
  ageDays: number;
  currentlyInUse: boolean;
  priorityScore: number;
  reasons: string[];
}

export type MessageSenderType = 'OPERATOR' | 'OFFICE';

export interface Message {
  id: string;
  operatorId: string;
  senderType: MessageSenderType;
  senderUserId: string | null;
  body: string;
  createdAt: string;
  senderUser?: { id: string; fullName: string } | null;
}

export interface MessageThread {
  operatorId: string;
  items: Message[];
}

export interface Company {
  id: string;
  name: string;
  jurisdiction: string;
  supportPhone: string | null;
  supportNotes: string | null;
  /** Auth/Billing Platform Phase 4 (registration depth) — org intake fields, all optional. */
  abn: string | null;
  industry: string | null;
  phone: string | null;
  fleetSizeEstimate: number | null;
  /** When this company's admin accepted the Terms of Service/Privacy Policy — null for companies provisioned before this field existed. */
  termsAcceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface MembershipView {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  role: { id: string; name: string };
  createdAt: string;
  archivedAt: string | null;
}

export interface RoleView {
  id: string;
  name: string;
  description: string | null;
  isSystemTemplate: boolean;
  permissionKeys: string[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface CompanyChoice {
  id: string;
  name: string;
}

export type LoginResult =
  | { status: 'authenticated'; accessToken: string; company: CompanyChoice }
  | { status: 'choose_company'; preAuthToken: string; companies: CompanyChoice[] }
  | { status: 'mfa_required'; mfaToken: string }
  /** Auth/Billing Platform Phase 3: this company mandates MFA and the account doesn't have it enabled yet. */
  | { status: 'mfa_setup_required'; setupToken: string }
  /** Auth/Billing Platform Phase 3: this company's password-expiry policy requires a new password before continuing. */
  | { status: 'password_expired'; changeToken: string };

export interface CurrentUser {
  userId: string;
  username: string;
  fullName: string;
  company: { id: string; name: string; jurisdiction: string };
  membershipId: string;
  role: { id: string; name: string };
  permissions: string[];
  /** Whether this account has multi-factor authentication enabled. */
  mfaEnabled: boolean;
  /** Auth/Billing Platform Phase 3: this company's policy mandates MFA — the Profile page disables "Disable MFA" and explains why. */
  mfaRequiredByCompany: boolean;
  /** Set if this login is also an Operator's DriverOS login (DriverOS v0 milestone). */
  operator: { id: string; fullName: string } | null;
}

/** A company's MFA/password-expiry policy (Auth/Billing Platform Phase 3). */
export interface SecuritySettings {
  mfaRequired: boolean;
  /** `null` means no expiry policy. */
  passwordExpiryDays: number | null;
  /** True if the company has never set its own policy (platform defaults apply). */
  isDefault: boolean;
}

export interface MfaSetup {
  secret: string;
  otpauthUrl: string;
}

export interface AuthProviders {
  magicLink: true;
  webauthn: true;
  google: boolean;
  microsoft: boolean;
}

export interface PasskeySummary {
  id: string;
  deviceLabel: string | null;
  createdAt: string;
  lastUsedAt: string;
}

export interface SessionSummary {
  id: string;
  ipAddress: string;
  userAgent: string | null;
  deviceLabel: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface HealthCheckResult {
  status: 'ok' | 'error' | 'shutting_down';
  info?: Record<string, { status: string }>;
  error?: Record<string, { status: string }>;
  details?: Record<string, { status: string }>;
}

export type SubscriptionStatus = 'NONE' | 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

export interface BillingStatus {
  subscriptionStatus: SubscriptionStatus;
  planPriceId: string | null;
  hasStripeCustomer: boolean;
  billingConfigured: boolean;
  trialEndsAt: string | null;
  trialActive: boolean;
  /** Auth/Billing Platform Phase 5/7: dunning-cycle state — see BillingPage's payment-failure banner. */
  paymentFailureCount: number;
  lastPaymentFailedAt: string | null;
  nextPaymentAttemptAt: string | null;
}
