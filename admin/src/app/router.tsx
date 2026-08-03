import { createBrowserRouter } from 'react-router';
import { ProtectedRoute } from '@/app/ProtectedRoute';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { OrganisationsListPage } from '@/features/organisations/OrganisationsListPage';
import { NewCustomerLoginPage } from '@/features/organisations/NewCustomerLoginPage';
import { OrganisationDetailPage } from '@/features/organisations/OrganisationDetailPage';
import { CustomerUserDetailPage } from '@/features/customer-users/CustomerUserDetailPage';
import { AnnouncementsPage } from '@/features/support/AnnouncementsPage';
import { FeatureFlagsPage } from '@/features/feature-flags/FeatureFlagsPage';
import { SystemHealthPage } from '@/features/system/SystemHealthPage';
import { FleetPage } from '@/features/fleet/FleetPage';
import { AdminUsersPage } from '@/features/admin-users/AdminUsersPage';
import { AuditLogPage } from '@/features/audit-log/AuditLogPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { NotFoundPage } from '@/features/shared/NotFoundPage';

export const router = createBrowserRouter(
  [
    { path: '/login', element: <LoginPage /> },
    {
      element: <ProtectedRoute />,
      children: [
        { path: '/', element: <DashboardPage /> },
        { path: '/organisations', element: <OrganisationsListPage /> },
        { path: '/organisations/new', element: <NewCustomerLoginPage /> },
        { path: '/organisations/:id', element: <OrganisationDetailPage /> },
        { path: '/customer-users/:userId', element: <CustomerUserDetailPage /> },
        { path: '/announcements', element: <AnnouncementsPage /> },
        { path: '/feature-flags', element: <FeatureFlagsPage /> },
        { path: '/system', element: <SystemHealthPage /> },
        { path: '/fleet', element: <FleetPage /> },
        { path: '/admin-users', element: <AdminUsersPage /> },
        { path: '/audit-log', element: <AuditLogPage /> },
        { path: '/settings', element: <SettingsPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  // Deployed under fleethq.online/admin (see vite.config.ts's `base`) — Vite
  // sets import.meta.env.BASE_URL to match it ('/admin/'), so route paths
  // above stay written relative to the app root in both dev and production.
  // react-router's basename must not carry the trailing slash BASE_URL does.
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') },
);
