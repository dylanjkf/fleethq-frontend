import { Avatar, AvatarFallback, initialsFrom } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { PERMISSION_CATALOG } from '@/lib/permissions';
import { MfaCard } from './MfaCard';
import { SessionsCard } from './SessionsCard';

export function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  const granted = new Set(user.permissions);
  const grantedByCategory = [...new Set(PERMISSION_CATALOG.map((p) => p.category))]
    .map((category) => ({
      category,
      permissions: PERMISSION_CATALOG.filter((p) => p.category === category && granted.has(p.key)),
    }))
    .filter((group) => group.permissions.length > 0);

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>Profile</PanelTitle>
          <PanelDescription>Your identity and access within {user.company.name}.</PanelDescription>
        </div>
      </PanelHeader>

      <Card className="max-w-lg">
        <CardContent className="flex items-center gap-4 pt-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-base">{initialsFrom(user.fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-base font-semibold text-(--text-primary)">{user.fullName}</p>
            <p className="text-sm text-(--text-tertiary)">{user.username}</p>
            <Badge variant="accent" className="mt-1">
              {user.role.name}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-lg">
        <CardHeader className="flex-col items-start gap-1">
          <CardTitle>Company</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="text-(--text-primary)">{user.company.name}</p>
          <p className="text-(--text-tertiary)">Jurisdiction: {user.company.jurisdiction}</p>
        </CardContent>
      </Card>

      <MfaCard initiallyEnabled={user.mfaEnabled} />

      <SessionsCard />

      <Card className="max-w-lg">
        <CardHeader className="flex-col items-start gap-1">
          <CardTitle>Your permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {grantedByCategory.length === 0 ? (
            <p className="text-sm text-(--text-tertiary)">No permissions granted.</p>
          ) : (
            grantedByCategory.map(({ category, permissions }) => (
              <div key={category}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-(--text-tertiary)">
                  {category}
                </p>
                <ul className="space-y-0.5 text-sm text-(--text-secondary)">
                  {permissions.map((permission) => (
                    <li key={permission.key}>{permission.description}</li>
                  ))}
                </ul>
                <Separator className="mt-3" />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </Panel>
  );
}
