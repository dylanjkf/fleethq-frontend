import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Settings2, Truck, Users } from 'lucide-react';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { CountWidget } from '@/features/dashboard/widgets/CountWidget';
import { SystemHealthWidget } from '@/features/dashboard/widgets/SystemHealthWidget';
import { UpcomingMaintenanceWidget } from '@/features/dashboard/widgets/UpcomingMaintenanceWidget';
import { RecentActivityWidget } from '@/features/dashboard/widgets/RecentActivityWidget';
import { FleetGraphWidget } from '@/features/dashboard/widgets/FleetGraphWidget';
import { OperationsSnapshotWidget } from '@/features/dashboard/widgets/OperationsSnapshotWidget';
import { CompliancePositionWidget } from '@/features/dashboard/widgets/CompliancePositionWidget';
import { ExpiringSoonWidget } from '@/features/dashboard/widgets/ExpiringSoonWidget';
import { FleetUtilisationWidget } from '@/features/dashboard/widgets/FleetUtilisationWidget';
import { getMyDashboardLayout, setMyDashboardLayout, type WidgetSlot } from '@/api/dashboard-layouts';
import { listAssets } from '@/api/assets';
import { listOperators } from '@/api/operators';
import { listUsers } from '@/api/users';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { CustomizeDashboardDialog } from '@/features/dashboard/CustomizeDashboardDialog';

/**
 * A grid of independent widget cards rendered in the order (and with the
 * visibility) the user has saved for their dashboard — see the Saved Layouts
 * pattern. "Customize" reorders/hides widgets; an admin can also save an
 * arrangement as a preset and deploy it to others (Administration → Dashboards).
 * Falls back to the full catalog, all visible, when nothing is saved.
 */
export function DashboardPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [customizing, setCustomizing] = useState(false);

  const assetsQuery = useQuery({ queryKey: ['assets', 'count'], queryFn: () => listAssets({ pageSize: 1 }), enabled: can(PERMISSIONS.ASSETS_VIEW) });
  const operatorsQuery = useQuery({ queryKey: ['operators', 'count'], queryFn: () => listOperators({ pageSize: 1 }), enabled: can(PERMISSIONS.OPERATORS_VIEW) });
  const usersQuery = useQuery({ queryKey: ['users', 'count'], queryFn: () => listUsers({ pageSize: 1 }), enabled: can(PERMISSIONS.USERS_VIEW) });
  const layoutQuery = useQuery({ queryKey: ['dashboard', 'layout'], queryFn: getMyDashboardLayout });

  const saveM = useMutation({ mutationFn: (widgets: WidgetSlot[]) => setMyDashboardLayout(widgets), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard', 'layout'] }) });

  // Each widget keyed the same as the backend catalog (dashboard-widgets.ts).
  const nodes: Record<string, ReactNode> = useMemo(
    () => ({
      count_fleet: <CountWidget title="Fleet" icon={Truck} value={assetsQuery.data?.total} isLoading={assetsQuery.isLoading} isError={assetsQuery.isError} />,
      count_operators: <CountWidget title="Operators" icon={Users} value={operatorsQuery.data?.total} isLoading={operatorsQuery.isLoading} isError={operatorsQuery.isError} />,
      count_users: <CountWidget title="Users" icon={Users} value={usersQuery.data?.total} isLoading={usersQuery.isLoading} isError={usersQuery.isError} />,
      system_health: <SystemHealthWidget />,
      company_status: (
        <Card>
          <CardHeader>
            <CardTitle>Company Status</CardTitle>
            <Building2 className="h-4 w-4 text-(--text-tertiary)" />
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm font-medium text-(--text-primary)">{user?.company.name}</p>
            <Badge variant="accent">{user?.company.jurisdiction}</Badge>
          </CardContent>
        </Card>
      ),
      upcoming_maintenance: <UpcomingMaintenanceWidget />,
      recent_activity: <RecentActivityWidget />,
      fleet_graph: <FleetGraphWidget />,
      operations_snapshot: <OperationsSnapshotWidget />,
      compliance_position: <CompliancePositionWidget />,
      expiring_soon: <ExpiringSoonWidget />,
      fleet_utilisation: <FleetUtilisationWidget />,
    }),
    [assetsQuery, operatorsQuery, usersQuery, user],
  );

  const layout = layoutQuery.data?.widgets ?? [];
  const visible = layout.filter((w) => w.visible && nodes[w.key]);

  // The richer widgets (multi-bar / multi-stat / list panels) need more than one
  // grid cell to read well; the simple count/gauge cards stay a single column.
  const SPAN: Record<string, string> = {
    operations_snapshot: 'sm:col-span-2 lg:col-span-4',
    compliance_position: 'sm:col-span-2 lg:col-span-2',
    expiring_soon: 'sm:col-span-2 lg:col-span-2',
    fleet_utilisation: 'lg:col-span-2',
  };

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>Good to see you, {user?.fullName.split(' ')[0]}</PanelTitle>
          <PanelDescription>Here's what's happening at {user?.company.name} today.</PanelDescription>
        </div>
        <Button variant="secondary" onClick={() => setCustomizing(true)} disabled={!layoutQuery.data}>
          <Settings2 className="h-4 w-4" /> Customize
        </Button>
      </PanelHeader>

      {/* The layout query decides which widgets render, so a failure here would
          otherwise blank the whole dashboard — the first page every user lands
          on. Show a retryable error instead of an empty grid. */}
      {layoutQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : layoutQuery.isError ? (
        <ErrorState message="Couldn't load your dashboard." onRetry={() => layoutQuery.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((w) => (
            <div key={w.key} className={SPAN[w.key]}>{nodes[w.key]}</div>
          ))}
        </div>
      )}

      {layoutQuery.data && (
        <CustomizeDashboardDialog
          open={customizing}
          onOpenChange={setCustomizing}
          layout={layout}
          catalog={layoutQuery.data.catalog}
          isSaving={saveM.isPending}
          onSave={async (widgets) => {
            await saveM.mutateAsync(widgets);
            setCustomizing(false);
          }}
        />
      )}
    </Panel>
  );
}
