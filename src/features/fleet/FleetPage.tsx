import { Navigate } from 'react-router';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssetsTab } from '@/features/assets/AssetsTab';
import { AssetCategoriesTab } from '@/features/assets/AssetCategoriesTab';
import { AttachedUnitsTab } from '@/features/attached-units/AttachedUnitsTab';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

/**
 * Fleet Registry per 07-FleetHQ/FleetHQ_Overview.md: "asset, attached unit,
 * operator... records." Assets and Attached Units are both registry entities
 * that only differ in shape, so they're tabs of one page rather than two
 * separate top-level nav items — same pattern as AdministrationPage.
 */
export function FleetPage() {
  const { can } = usePermissions();

  const tabs = [
    can(PERMISSIONS.ASSETS_VIEW) && { value: 'assets', label: 'Assets', content: <AssetsTab /> },
    can(PERMISSIONS.ATTACHED_UNITS_VIEW) && {
      value: 'attached-units',
      label: 'Attached Units',
      content: <AttachedUnitsTab />,
    },
    can(PERMISSIONS.ASSETS_VIEW) && { value: 'categories', label: 'Categories', content: <AssetCategoriesTab /> },
  ].filter(Boolean) as { value: string; label: string; content: React.ReactNode }[];

  if (tabs.length === 0) {
    return <Navigate to="/" replace />;
  }

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>Fleet</PanelTitle>
          <PanelDescription>Every Asset and Attached Unit in your fleet.</PanelDescription>
        </div>
      </PanelHeader>

      <Tabs defaultValue={tabs[0].value}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </Panel>
  );
}
