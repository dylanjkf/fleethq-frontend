import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getReadiness } from '@/api/health';

/** The one widget backed by real infrastructure signal (GET /health/ready) rather than business data. */
export function SystemHealthWidget() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health', 'ready'],
    queryFn: getReadiness,
    refetchInterval: 30_000,
    retry: false,
  });

  const isHealthy = data?.status === 'ok';

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Health</CardTitle>
        <Activity className="h-4 w-4 text-(--text-tertiary)" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-6 w-20" />
        ) : (
          <Badge variant={isError || !isHealthy ? 'danger' : 'success'}>
            {isError || !isHealthy ? 'Degraded' : 'Operational'}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
