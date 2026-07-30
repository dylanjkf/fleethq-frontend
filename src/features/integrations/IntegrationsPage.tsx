import { Navigate } from 'react-router';
import { Plug } from 'lucide-react';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConnectionsTab } from '@/features/integrations/ConnectionsTab';
import { SyncDashboardTab } from '@/features/integrations/SyncDashboardTab';
import { ErrorCentreTab } from '@/features/integrations/ErrorCentreTab';
import { WebhooksTab } from '@/features/integrations/WebhooksTab';
import { CredentialsTab } from '@/features/integrations/CredentialsTab';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

/**
 * The Integration Hub (10-Integrations/Integration_Hub.md): a generic,
 * plugin-shaped framework for connecting FleetHQ to whatever external
 * system a customer already runs (ERP, warehouse software, accounting
 * package) — CSV/Excel, a generic REST poller, and a generic incoming
 * webhook receiver ship as reference connectors. Not a bespoke
 * SAP/Oracle/NetSuite/etc. integration; the architecture just doesn't block
 * adding one later as a new connector against the same interface.
 *
 * The Data Mapping Designer lives inside a connection's detail drawer
 * (ConnectionsTab) rather than as its own top-level tab — a field mapping
 * only ever makes sense in the context of one already-selected connection.
 */
export function IntegrationsPage() {
  const { can } = usePermissions();
  const canView = can(PERMISSIONS.INTEGRATIONS_VIEW);
  const canManage = can(PERMISSIONS.INTEGRATIONS_MANAGE);

  if (!canView && !canManage) {
    return <Navigate to="/" replace />;
  }

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>
            <span className="inline-flex items-center gap-2">
              <Plug className="h-5 w-5 text-accent-500" /> Integration Hub
            </span>
          </PanelTitle>
          <PanelDescription>
            Connect FleetHQ to whatever ERP, warehouse, or accounting system you already run — CSV/Excel import-export, a
            generic REST poller, and incoming/outgoing webhooks.
          </PanelDescription>
        </div>
      </PanelHeader>

      <Tabs defaultValue="connections">
        <TabsList>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="dashboard">Sync Dashboard</TabsTrigger>
          <TabsTrigger value="errors">Error Centre</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
        </TabsList>

        <TabsContent value="connections">
          <ConnectionsTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="dashboard">
          <SyncDashboardTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="errors">
          <ErrorCentreTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="webhooks">
          <WebhooksTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="credentials">
          <CredentialsTab canManage={canManage} />
        </TabsContent>
      </Tabs>
    </Panel>
  );
}
