import { lazy, type ComponentType } from 'react';

/**
 * Reload-once guard against stale code-split chunks.
 *
 * When we ship a new build, the service worker may still hold the previous
 * app shell while the hashed chunk filenames have changed. The first time a
 * user navigates to a route they haven't opened yet this session, the dynamic
 * `import()` for its chunk 404s ("Failed to fetch dynamically imported
 * module") and the route throws to the error boundary — which is exactly the
 * "click a new tab → error, refresh → gone" behaviour: refreshing pulls the
 * new shell so the retried import resolves.
 *
 * This wrapper closes that gap automatically: on the first import failure it
 * forces a single full reload (guarded by a sessionStorage flag keyed to the
 * chunk, so we never loop) which fetches the current shell, and the navigation
 * then succeeds without the user seeing an error. A genuinely missing chunk
 * (offline, real 404) still surfaces to the error boundary on the second try.
 */
function lazyWithRetry<T extends ComponentType<unknown>>(
  key: string,
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    const flag = `chunk-reload:${key}`;
    try {
      const mod = await factory();
      sessionStorage.removeItem(flag);
      return mod;
    } catch (err) {
      // Only self-heal once per chunk per session — if we already reloaded and
      // it still fails, the chunk is genuinely unreachable; let it throw.
      if (typeof window !== 'undefined' && !sessionStorage.getItem(flag)) {
        sessionStorage.setItem(flag, '1');
        window.location.reload();
        // Never resolves — the reload replaces the page. Keeps Suspense pending
        // rather than flashing the error boundary before navigation happens.
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}

/**
 * Code-split feature pages, kept in their own module so `router.tsx` exports
 * only the router (and so the react-refresh "only-export-components" rule stays
 * happy — this file exports components exclusively). Each entry is a
 * `React.lazy` chunk fetched on first navigation; `default:`-mapping adapts our
 * named page exports to lazy()'s default-export contract. `lazyWithRetry`
 * recovers automatically from a stale-chunk import failure after a new deploy.
 */
export const DashboardPage = lazyWithRetry('DashboardPage', () => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
export const FleetPage = lazyWithRetry('FleetPage', () => import('@/features/fleet/FleetPage').then((m) => ({ default: m.FleetPage })));
export const AssetDetailPage = lazyWithRetry('AssetDetailPage', () => import('@/features/assets/AssetDetailPage').then((m) => ({ default: m.AssetDetailPage })));
export const AttachedUnitDetailPage = lazyWithRetry('AttachedUnitDetailPage', () => import('@/features/attached-units/AttachedUnitDetailPage').then((m) => ({ default: m.AttachedUnitDetailPage })));
export const FuelPage = lazyWithRetry('FuelPage', () => import('@/features/fuel/FuelPage').then((m) => ({ default: m.FuelPage })));
export const OperatorsListPage = lazyWithRetry('OperatorsListPage', () => import('@/features/operators/OperatorsListPage').then((m) => ({ default: m.OperatorsListPage })));
export const DispatchPage = lazyWithRetry('DispatchPage', () => import('@/features/dispatch/DispatchPage').then((m) => ({ default: m.DispatchPage })));
export const CustomersPage = lazyWithRetry('CustomersPage', () => import('@/features/customers/CustomersPage').then((m) => ({ default: m.CustomersPage })));
export const DepotsPage = lazyWithRetry('DepotsPage', () => import('@/features/depots/DepotsPage').then((m) => ({ default: m.DepotsPage })));
export const MaintenancePage = lazyWithRetry('MaintenancePage', () => import('@/features/maintenance/MaintenancePage').then((m) => ({ default: m.MaintenancePage })));
export const CompliancePage = lazyWithRetry('CompliancePage', () => import('@/features/compliance/CompliancePage').then((m) => ({ default: m.CompliancePage })));
export const ChecklistsPage = lazyWithRetry('ChecklistsPage', () => import('@/features/checklists/ChecklistsPage').then((m) => ({ default: m.ChecklistsPage })));
export const FormsPage = lazyWithRetry('FormsPage', () => import('@/features/forms/FormsPage').then((m) => ({ default: m.FormsPage })));
export const MessagesPage = lazyWithRetry('MessagesPage', () => import('@/features/messages/MessagesPage').then((m) => ({ default: m.MessagesPage })));
export const ReportsPage = lazyWithRetry('ReportsPage', () => import('@/features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })));
export const ImpactPage = lazyWithRetry('ImpactPage', () => import('@/features/reports/ImpactPage').then((m) => ({ default: m.ImpactPage })));
export const DocumentsPage = lazyWithRetry('DocumentsPage', () => import('@/features/documents/DocumentsPage').then((m) => ({ default: m.DocumentsPage })));
export const KnowledgeBasePage = lazyWithRetry('KnowledgeBasePage', () => import('@/features/knowledge/KnowledgeBasePage').then((m) => ({ default: m.KnowledgeBasePage })));
export const AdministrationPage = lazyWithRetry('AdministrationPage', () => import('@/features/administration/AdministrationPage').then((m) => ({ default: m.AdministrationPage })));
export const AuditLogPage = lazyWithRetry('AuditLogPage', () => import('@/features/audit/AuditLogPage').then((m) => ({ default: m.AuditLogPage })));
export const BillingPage = lazyWithRetry('BillingPage', () => import('@/features/billing/BillingPage').then((m) => ({ default: m.BillingPage })));
export const ProfilePage = lazyWithRetry('ProfilePage', () => import('@/features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })));
export const SettingsPage = lazyWithRetry('SettingsPage', () => import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
export const IntegrationsPage = lazyWithRetry('IntegrationsPage', () => import('@/features/integrations/IntegrationsPage').then((m) => ({ default: m.IntegrationsPage })));
