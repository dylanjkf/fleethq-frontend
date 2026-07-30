import { Navigate } from 'react-router';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompanyTab } from '@/features/administration/CompanyTab';
import { NotificationsDigestTab } from '@/features/administration/NotificationsDigestTab';
import { RolesTab } from '@/features/administration/RolesTab';
import { UsersTab } from '@/features/administration/UsersTab';
import { NotificationPresetsTab } from '@/features/administration/NotificationPresetsTab';
import { DashboardLayoutsTab } from '@/features/administration/DashboardLayoutsTab';
import { AddressBooksTab } from '@/features/administration/AddressBooksTab';
import { AnalyticsTab } from '@/features/administration/AnalyticsTab';
import { BarcodeConfigTab } from '@/features/administration/BarcodeConfigTab';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

export function AdministrationPage() {
  const { can } = usePermissions();

  const tabs = [
    can(PERMISSIONS.COMPANIES_VIEW) && { value: 'company', label: 'Company', content: <CompanyTab /> },
    can(PERMISSIONS.USERS_VIEW) && { value: 'users', label: 'Users', content: <UsersTab /> },
    can(PERMISSIONS.ROLES_VIEW) && { value: 'roles', label: 'Roles', content: <RolesTab /> },
    can(PERMISSIONS.NOTIFICATIONS_DIGEST_SEND) && { value: 'notifications', label: 'Notifications', content: <NotificationsDigestTab /> },
    can(PERMISSIONS.NOTIFICATIONS_MANAGE) && { value: 'notification-presets', label: 'Notification presets', content: <NotificationPresetsTab /> },
    can(PERMISSIONS.DASHBOARD_MANAGE) && { value: 'dashboards', label: 'Dashboards', content: <DashboardLayoutsTab /> },
    can(PERMISSIONS.ADDRESS_BOOK_MANAGE) && { value: 'address-books', label: 'Address books', content: <AddressBooksTab /> },
    can(PERMISSIONS.ANALYTICS_MANAGE) && { value: 'analytics', label: 'Analytics', content: <AnalyticsTab /> },
    can(PERMISSIONS.BARCODE_CONFIG_MANAGE) && { value: 'barcode', label: 'Barcode scanning', content: <BarcodeConfigTab /> },
  ].filter(Boolean) as { value: string; label: string; content: React.ReactNode }[];

  if (tabs.length === 0) {
    // Sidebar already hides this nav item without any Administration
    // permission, but a direct URL visit should still be denied gracefully.
    return <Navigate to="/" replace />;
  }

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>Administration</PanelTitle>
          <PanelDescription>Company profile, users, and roles.</PanelDescription>
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
