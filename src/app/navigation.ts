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

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
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
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, status: 'active' },
  {
    label: 'Fleet',
    path: '/fleet',
    icon: Truck,
    permissions: [PERMISSIONS.ASSETS_VIEW, PERMISSIONS.ATTACHED_UNITS_VIEW],
    status: 'active',
  },
  {
    label: 'Operators',
    path: '/operators',
    icon: Users,
    permissions: [PERMISSIONS.OPERATORS_VIEW],
    status: 'active',
  },
  {
    label: 'Maintenance',
    path: '/maintenance',
    icon: Wrench,
    permissions: [PERMISSIONS.MAINTENANCE_VIEW],
    status: 'active',
  },
  {
    label: 'Dispatch',
    path: '/dispatch',
    icon: Map,
    permissions: [PERMISSIONS.DISPATCH_VIEW],
    status: 'active',
  },
  {
    label: 'Customers',
    path: '/customers',
    icon: BookUser,
    permissions: [PERMISSIONS.CUSTOMERS_VIEW],
    status: 'active',
  },
  {
    label: 'Depots',
    path: '/depots',
    icon: Warehouse,
    permissions: [PERMISSIONS.DEPOTS_VIEW],
    status: 'active',
  },
  {
    label: 'Compliance',
    path: '/compliance',
    icon: ShieldCheck,
    permissions: [PERMISSIONS.COMPLIANCE_VIEW],
    status: 'active',
  },
  {
    label: 'Inspections',
    path: '/checklists',
    icon: ClipboardCheck,
    permissions: [PERMISSIONS.CHECKLISTS_VIEW],
    status: 'active',
  },
  {
    label: 'Forms',
    path: '/forms',
    icon: FileInput,
    permissions: [PERMISSIONS.FORMS_VIEW],
    status: 'active',
  },
  {
    label: 'Messages',
    path: '/messages',
    icon: MessageSquare,
    permissions: [PERMISSIONS.MESSAGES_VIEW],
    status: 'active',
  },
  {
    label: 'Documents',
    path: '/documents',
    icon: FileText,
    permissions: [PERMISSIONS.DOCUMENTS_VIEW],
    status: 'active',
  },
  {
    label: 'Knowledge Base',
    path: '/knowledge-base',
    icon: BookOpen,
    permissions: [PERMISSIONS.KNOWLEDGE_VIEW],
    status: 'active',
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: BarChart3,
    permissions: [PERMISSIONS.REPORTS_VIEW],
    status: 'active',
  },
  {
    label: 'Impact',
    path: '/impact',
    icon: TrendingUp,
    permissions: [PERMISSIONS.REPORTS_VIEW],
    status: 'active',
  },
  {
    label: 'Fuel',
    path: '/fuel',
    icon: Fuel,
    permissions: [PERMISSIONS.FUEL_VIEW],
    status: 'active',
  },
  {
    label: 'Integrations',
    path: '/integrations',
    icon: Cable,
    permissions: [PERMISSIONS.INTEGRATIONS_VIEW],
    status: 'active',
  },
  {
    label: 'Administration',
    path: '/administration',
    icon: Building2,
    permissions: [PERMISSIONS.USERS_VIEW, PERMISSIONS.ROLES_VIEW, PERMISSIONS.COMPANIES_VIEW],
    status: 'active',
  },
  {
    label: 'Audit Log',
    path: '/audit-log',
    icon: ScrollText,
    permissions: [PERMISSIONS.AUDIT_VIEW],
    status: 'active',
  },
  {
    label: 'Billing',
    path: '/billing',
    icon: CreditCard,
    permissions: [PERMISSIONS.BILLING_VIEW],
    status: 'active',
  },
  { label: 'Settings', path: '/settings', icon: Settings, status: 'active' },
];
