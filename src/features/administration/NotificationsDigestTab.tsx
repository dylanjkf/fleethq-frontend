import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { previewDigest, sendDigest } from '@/api/notifications';
import { ApiClientError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

/**
 * Email digest channel v0: there's no real email provider wired up yet, so
 * "sending" computes what each recipient's digest would contain and marks
 * those notifications as emailed, so a repeat run never double-sends —
 * see Notification.emailedAt's doc comment in the schema.
 */
export function NotificationsDigestTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['notifications', 'digest', 'preview'],
    queryFn: previewDigest,
  });

  const sendMutation = useMutation({
    mutationFn: sendDigest,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'digest', 'preview'] });
      toast({
        title:
          result.recipientCount === 0
            ? 'Nothing to send'
            : `Digest sent to ${result.recipientCount} ${result.recipientCount === 1 ? 'person' : 'people'}`,
        description:
          result.skippedCount > 0
            ? `${result.skippedCount} had no email address and were reached in-app only.`
            : undefined,
        variant: 'success',
      });
    },
    onError: (err) =>
      toast({ title: 'Could not send the digest', description: err instanceof ApiClientError ? err.message : 'Try again.', variant: 'destructive' }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email digest</CardTitle>
        <CardDescription>
          Preview what each person's unread notifications would say, then send it. Already-sent notifications
          aren't included again.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : isError ? (
          <ErrorState message={error instanceof ApiClientError ? error.message : 'Could not load the digest preview.'} onRetry={() => refetch()} />
        ) : !data || data.recipients.length === 0 ? (
          <EmptyState icon={Mail} title="Nothing pending" description="Every recipient's notifications are already read or already emailed." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Preview</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recipients.map((r) => (
                <TableRow key={r.userId}>
                  <TableCell className="font-medium">{r.fullName}</TableCell>
                  <TableCell className="tabular-nums">{r.itemCount}</TableCell>
                  <TableCell className="text-(--text-tertiary)">{r.subjects.join('; ')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="mt-4">
          <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending || (data?.recipients.length ?? 0) === 0}>
            {sendMutation.isPending ? 'Sending…' : 'Send digest now'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
