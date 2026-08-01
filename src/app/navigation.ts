import {
  BarChart3,
  BookOpen,
  BookUser,
  Building2,
  Cable,
  ClipboardCheck,
  CreditCard,
  FileInput,
  FileText,
  Fuel,
  LayoutDashboard,
  Map,
  MessageSquare,
  ScrollText,
  Settings,
  ShieldCheck,
  TrendingUp,
  Truck,
  Users,
  Warehouse,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { PERMISSIONS, type PermissionKey } from '@/lib/permissions';

/**
 * Sidebar sections, in order. Grouping turns a flat 20-item list into a
 * scannable operational hierarchy — the single biggest navigation win for an
 * enterprise-density product. Every item declares its group; the sidebar and
 * command palette both derive their structure from here.
 */
export const NAV_GROUP_ORDER = [
  'Overview',
  'Operations',
  'Fleet',
  'Compliance',
  'Workspace',
  'Insights',
  'System',
] as const;

export type NavGroup = (typeof NAV_GROUP_ORDER)[number];

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  group: NavGroup;
  /** Shown if the user has ANY of these. Omitted entirely means always visible. */
  permissions?: PermissionKey[];
  status: 'active' | 'coming-soon';
}

/**
 * Single source of truth for the sidebar — adding a future module (Dispatch,
 * Workshop, etc.) once its backend exists is one entry here, not a page
 * redesign. Unbuilt modules stay visible as "Coming Soon" rather than being
 * omitted, per the brief.
 *
 * Labeled "Operators," not "Drivers" — Asset_Class_Model.md's acceptance
 * criteria explicitly extends the generic-terminology rule to screens, not
 * just APIs/schema ("No table, API contract, or screen... refers to
 * Vehicle, Driver, or Trailer by name"). See the Decision Log for this build.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, group: 'Overview', status: 'active' },
  {
    label: 'Dispatch',
    path: '/dispatch',
    icon: Map,
    group: 'Operations',
    permissions: [PERMISSIONS.DISPATCH_VIEW],
    status: 'active',
  },
  {
    label: 'Operators',
    path: '/operators',
    icon: Users,
    group: 'Operations',
    permissions: [PERMISSIONS.OPERATORS_VIEW],
    status: 'active',
  },
  {
    label: 'Customers',
    path: '/customers',
    icon: BookUser,
    group: 'Operations',
    permissions: [PERMISSIONS.CUSTOMERS_VIEW],
    status: 'active',
  },
  {
    label: 'Depots',
    path: '/depots',
    icon: Warehouse,
    group: 'Operations',
    permissions: [PERMISSIONS.DEPOTS_VIEW],
    status: 'active',
  },
  {
    label: 'Fleet',
    path: '/fleet',
    icon: Truck,
    group: 'Fleet',
    permissions: [PERMISSIONS.ASSETS_VIEW, PERMISSIONS.ATTACHED_UNITS_VIEW],
    status: 'active',
  },
  {
    label: 'Maintenance',
    path: '/maintenance',
    icon: Wrench,
    group: 'Fleet',
    permissions: [PERMISSIONS.MAINTENANCE_VIEW],
    status: 'active',
  },
  {
    label: 'Fuel',
    path: '/fuel',
    icon: Fuel,
    group: 'Fleet',
    permissions: [PERMISSIONS.FUEL_VIEW],
    status: 'active',
  },
  {
    label: 'Compliance',
    path: '/compliance',
    icon: ShieldCheck,
    group: 'Compliance',
    permissions: [PERMISSIONS.COMPLIANCE_VIEW],
    status: 'active',
  },
  {
    label: 'Inspections',
    path: '/checklists',
    icon: ClipboardCheck,
    group: 'Compliance',
    permissions: [PERMISSIONS.CHECKLISTS_VIEW],
    status: 'active',
  },
  {
    label: 'Forms',
    path: '/forms',
    icon: FileInput,
    group: 'Compliance',
    permissions: [PERMISSIONS.FORMS_VIEW],
    status: 'active',
  },
  {
    label: 'Messages',
    path: '/messages',
    icon: MessageSquare,
    group: 'Workspace',
    permissions: [PERMISSIONS.MESSAGES_VIEW],
    status: 'active',
  },
  {
    label: 'Documents',
    path: '/documents',
    icon: FileText,
    group: 'Workspace',
    permissions: [PERMISSIONS.DOCUMENTS_VIEW],
    status: 'active',
  },
  {
    label: 'Knowledge Base',
    path: '/knowledge-base',
    icon: BookOpen,
    group: 'Workspace',
    permissions: [PERMISSIONS.KNOWLEDGE_VIEW],
    status: 'active',
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: BarChart3,
    group: 'Insights',
    permissions: [PERMISSIONS.REPORTS_VIEW],
    status: 'active',
  },
  {
    label: 'Impact',
    path: '/impact',
    icon: TrendingUp,
    group: 'Insights',
    permissions: [PERMISSIONS.REPORTS_VIEW],
    status: 'active',
  },
  {
    label: 'Integrations',
    path: '/integrations',
    icon: Cable,
    group: 'System',
    permissions: [PERMISSIONS.INTEGRATIONS_VIEW],
    status: 'active',
  },
  {
    label: 'Administration',
    path: '/administration',
    icon: Building2,
    group: 'System',
    permissions: [PERMISSIONS.USERS_VIEW, PERMISSIONS.ROLES_VIEW, PERMISSIONS.COMPANIES_VIEW],
    status: 'active',
  },
  {
    label: 'Audit Log',
    path: '/audit-log',
    icon: ScrollText,
    group: 'System',
    permissions: [PERMISSIONS.AUDIT_VIEW],
    status: 'active',
  },
  {
    label: 'Billing',
    path: '/billing',
    icon: CreditCard,
    group: 'System',
    permissions: [PERMISSIONS.BILLING_VIEW],
    status: 'active',
  },
  { label: 'Settings', path: '/settings', icon: Settings, group: 'System', status: 'active' },
];

/** Lookup a nav item by exact path — used to title pages and build breadcrumbs. */
export function findNavItemByPath(path: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.path === path);
}
