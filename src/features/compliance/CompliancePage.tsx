import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus, ShieldCheck, Upload } from 'lucide-react';
import {
  archiveComplianceDocument,
  createComplianceDocument,
  listComplianceDocuments,
  updateComplianceDocument,
} from '@/api/compliance';
import { fetchAttachmentObjectUrl } from '@/api/attachments';
import { getAtRiskOperators } from '@/api/fatigue';
import { importComplianceDocuments } from '@/api/imports';
import type { ComplianceDocument, ComplianceDocumentType } from '@/api/types';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { ComplianceExpiryStatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ComplianceDocumentFormDialog,
  type ComplianceDocumentFormValues,
} from '@/features/compliance/ComplianceDocumentFormDialog';
import { ImportWizardDialog } from '@/features/imports/ImportWizardDialog';
import { FatigueRulesTab } from '@/features/compliance/FatigueRulesTab';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/lib/permissions';
import { describeApiError } from '@/lib/errors';

const QUERY_KEY = ['compliance-documents', 'list'];
const IMPORT_FIELDS = [
  { key: 'assetId', label: 'Asset ID', required: false },
  { key: 'operatorId', label: 'Operator ID', required: false },
  { key: 'documentType', label: 'Document type', required: true },
  { key: 'documentNumber', label: 'Document number', required: false },
  { key: 'issuedAt', label: 'Issued at', required: false },
  { key: 'expiresAt', label: 'Expires at', required: true },
  { key: 'notes', label: 'Notes', required: false },
];

const DOCUMENT_TYPE_LABEL: Record<ComplianceDocumentType, string> = {
  REGISTRATION: 'Registration',
  INSURANCE: 'Insurance',
  ROADWORTHY: 'Roadworthy',
  LICENCE: 'Licence',
  MEDICAL_CERTIFICATE: 'Medical certificate',
};

async function viewFile(id: string) {
  const url = await fetchAttachmentObjectUrl(id);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * 08-Compliance/Australian_Compliance.md's Compliance dashboard, in two
 * halves: per-asset document expiry tracking (registration/insurance/
 * roadworthy), sorted by soonest-expiring; and the Fatigue tab, showing
 * every operator currently approaching or over an AU Standard Hours limit
 * (see Fatigue_Hours implementation notes). NHVR asset-standards checks and
 * Chain-of-Responsibility evidencing are still not built — see the
 * CHANGELOG for the full scope this milestone covers.
 */
export function CompliancePage() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<ComplianceDocument | undefined>();
  const [archiving, setArchiving] = useState<ComplianceDocument | undefined>();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => listComplianceDocuments({ pageSize: 100 }),
  });

  const atRiskQuery = useQuery({
    queryKey: ['fatigue', 'at-risk'],
    queryFn: getAtRiskOperators,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: createComplianceDocument,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Compliance document logged', variant: 'success' });
    },
    onError: (err) =>
      toast({ title: 'Could not log document', description: describeApiError(err), variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & ComplianceDocumentFormValues) =>
      updateComplianceDocument(id, input),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Compliance document updated', variant: 'success' });
    },
    onError: (err) =>
      toast({ title: 'Could not update document', description: describeApiError(err), variant: 'destructive' }),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveComplianceDocument,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Compliance document archived', variant: 'success' });
      setArchiving(undefined);
    },
    onError: (err) =>
      toast({ title: 'Could not archive document', description: describeApiError(err), variant: 'destructive' }),
  });

  async function handleFormSubmit(values: ComplianceDocumentFormValues) {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, ...values });
    } else {
      await createMutation.mutateAsync(values);
    }
  }

  const documents = data?.items ?? [];

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>Compliance</PanelTitle>
          <PanelDescription>
            Registration, insurance, and roadworthy documents for every asset, plus licences and medical
            certificates for operators, sorted by what expires soonest.
          </PanelDescription>
        </div>
        {can(PERMISSIONS.COMPLIANCE_CREATE) && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Import CSV
            </Button>
            <Button
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Log document
            </Button>
          </div>
        )}
      </PanelHeader>

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="fatigue">
            Fatigue
            {!!atRiskQuery.data?.length && (
              <span className="ml-1.5 rounded-full bg-warning-500/20 px-1.5 text-xs text-warning-500">
                {atRiskQuery.data.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="fatigue-rules">Fatigue rules</TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState message={describeApiError(error)} onRetry={() => refetch()} />
          ) : documents.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No compliance documents yet"
              description="Log your first registration, insurance, or roadworthy document to get started."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applies to</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.asset?.name ?? doc.operator?.fullName ?? '—'}</TableCell>
                    <TableCell>{DOCUMENT_TYPE_LABEL[doc.documentType]}</TableCell>
                    <TableCell className="text-(--text-tertiary)">{doc.documentNumber ?? '—'}</TableCell>
                    <TableCell className="text-(--text-tertiary)">
                      {new Date(doc.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <ComplianceExpiryStatusBadge status={doc.expiryStatus} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {doc.fileAttachment && (
                          <Button variant="ghost" size="sm" onClick={() => viewFile(doc.fileAttachment!.id)}>
                            View file
                          </Button>
                        )}
                        {can(PERMISSIONS.COMPLIANCE_EDIT) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(doc);
                              setFormOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        )}
                        {can(PERMISSIONS.COMPLIANCE_ARCHIVE) && (
                          <Button variant="ghost" size="sm" onClick={() => setArchiving(doc)}>
                            Archive
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="fatigue">
          {atRiskQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : atRiskQuery.isError ? (
            <ErrorState message={describeApiError(atRiskQuery.error)} onRetry={() => atRiskQuery.refetch()} />
          ) : !atRiskQuery.data || atRiskQuery.data.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No operators currently at risk"
              description="Operators approaching or over a Standard Hours limit will appear here, based on their shift history."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operator</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atRiskQuery.data.map((status) => (
                  <TableRow key={status.operatorId}>
                    <TableCell className="font-medium">{status.operatorName}</TableCell>
                    <TableCell>
                      <span
                        className={`flex items-center gap-1.5 text-sm font-medium ${status.status === 'breach' ? 'text-danger-500' : 'text-warning-500'}`}
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {status.status === 'breach' ? 'In breach' : 'Approaching limit'}
                      </span>
                    </TableCell>
                    <TableCell className="text-(--text-tertiary)">
                      {[...status.breaches, ...status.approaching].map((flag) => flag.message).join(' ')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="fatigue-rules">
          <FatigueRulesTab />
        </TabsContent>
      </Tabs>

      <ComplianceDocumentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        document={editing}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(open) => !open && setArchiving(undefined)}
        title="Archive this compliance document?"
        description={`This ${archiving ? DOCUMENT_TYPE_LABEL[archiving.documentType].toLowerCase() : ''} record will no longer appear in active lists. This can't be undone from here.`}
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archiving && archiveMutation.mutate(archiving.id)}
        isConfirming={archiveMutation.isPending}
      />

      <ImportWizardDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        entityLabel="Compliance Document"
        fields={IMPORT_FIELDS}
        importFn={importComplianceDocuments}
        onImported={() => queryClient.invalidateQueries({ queryKey: QUERY_KEY })}
      />
    </Panel>
  );
}
