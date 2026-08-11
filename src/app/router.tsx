import { createBrowserRouter, type RouteObject } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/app/ProtectedRoute';
// Auth + shell stay eager — they're on the critical first-paint / login path.
import { LoginPage } from '@/features/auth/LoginPage';
import { SignupPage } from '@/features/auth/SignupPage';
import { SignupCompletePage } from '@/features/auth/SignupCompletePage';
import { ContactPage } from '@/features/auth/ContactPage';
import { TermsPage, PrivacyPage } from '@/features/auth/LegalPages';
import { ForgotPasswordPage, MagicLinkPage, OAuthCallbackPage, ResetPasswordPage, VerifyEmailPage } from '@/features/auth/AuthActionPages';
import { NotFoundPage } from '@/features/shared/NotFoundPage';
// Feature pages are code-split (React.lazy, in ./lazyPages) — each route ships
// as its own chunk fetched on first navigation. The Suspense boundary lives in
// AppShell around <Outlet/>.
import {
  DashboardPage, FleetPage, AssetDetailPage, AttachedUnitDetailPage, OperatorsListPage, DispatchPage, CustomersPage, DepotsPage,
  MaintenancePage, CompliancePage, ChecklistsPage, FormsPage, MessagesPage, ReportsPage, ImpactPage,
  DocumentsPage, KnowledgeBasePage, FuelPage, AdministrationPage, AuditLogPage, BillingPage,
  ProfilePage, SettingsPage, IntegrationsPage,
} from '@/app/lazyPages';

/**
 * The route table, exported separately from the router it's handed to so it can
 * be asserted against without a browser — see `router.spec.ts`, which checks
 * every sidebar entry actually resolves to a declared route. A nav link pointing
 * at a route that doesn't exist is a 404 the customer finds, not something a
 * type-checker can catch.
 */
export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/signup/complete', element: <SignupCompletePage /> },
  { path: '/contact', element: <ContactPage /> },
  { path: '/terms', element: <TermsPage /> },
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
  { path: '/magic-link', element: <MagicLinkPage /> },
  { path: '/oauth-callback', element: <OAuthCallbackPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/fleet', element: <FleetPage /> },
          { path: '/fleet/:assetId', element: <AssetDetailPage /> },
          { path: '/attached-units/:attachedUnitId', element: <AttachedUnitDetailPage /> },
          { path: '/operators', element: <OperatorsListPage /> },
          { path: '/maintenance', element: <MaintenancePage /> },
          { path: '/dispatch', element: <DispatchPage /> },
          { path: '/fuel', element: <FuelPage /> },
          { path: '/customers', element: <CustomersPage /> },
          { path: '/depots', element: <DepotsPage /> },
          { path: '/compliance', element: <CompliancePage /> },
          { path: '/checklists', element: <ChecklistsPage /> },
          { path: '/forms', element: <FormsPage /> },
          { path: '/messages', element: <MessagesPage /> },
          { path: '/documents', element: <DocumentsPage /> },
          { path: '/knowledge-base', element: <KnowledgeBasePage /> },
          { path: '/reports', element: <ReportsPage /> },
          { path: '/impact', element: <ImpactPage /> },
          { path: '/integrations', element: <IntegrationsPage /> },
          { path: '/administration', element: <AdministrationPage /> },
          { path: '/audit-log', element: <AuditLogPage /> },
          { path: '/billing', element: <BillingPage /> },
          { path: '/profile', element: <ProfilePage /> },
          { path: '/settings', element: <SettingsPage /> },
          // Branded catch-all for any unknown URL (authenticated shell).
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
