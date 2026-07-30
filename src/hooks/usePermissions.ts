import { useAuth } from '@/hooks/useAuth';
import type { PermissionKey } from '@/lib/permissions';

/**
 * The single hook every permission-aware nav item, page, and action should
 * use — 14-Security/Permissions_Model.md: "no feature is gated by a
 * hardcoded role check; all gating resolves through the permission system."
 */
export function usePermissions() {
  const { can, user } = useAuth();
  return {
    can,
    canAny: (permissions: PermissionKey[]) => permissions.some(can),
    canAll: (permissions: PermissionKey[]) => permissions.every(can),
    role: user?.role ?? null,
  };
}
