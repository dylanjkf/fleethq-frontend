import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { listDepots } from '@/api/depots';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PickerError } from '@/components/ui/picker-error';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const NO_DEPOT_VALUE = '__no_depot__';

const schema = z.object({
  title: z.string().min(1, 'Required').max(200),
  description: z.string().max(2000).optional(),
  /** `datetime-local` value (local wall time, no zone) or empty for "today". */
  scheduledAt: z.string().optional(),
});
export type JobFormValues = z.infer<typeof schema> & { pickupDepotId?: string };

interface JobFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: JobFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export function JobFormDialog({ open, onOpenChange, onSubmit, isSubmitting }: JobFormDialogProps) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', scheduledAt: '' },
  });
  const [pickupDepotId, setPickupDepotId] = useState(NO_DEPOT_VALUE);

  const depotsQuery = useQuery({
    queryKey: ['depots', 'list', 'for-job-form'],
    queryFn: () => listDepots({ pageSize: 200 }),
    enabled: open,
  });
  const depots = (depotsQuery.data?.items ?? []).filter((d) => !d.archivedAt);

  useEffect(() => {
    if (open) {
      form.reset({ title: '', description: '', scheduledAt: '' });
      setPickupDepotId(NO_DEPOT_VALUE);
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New job / run</DialogTitle>
        </DialogHeader>
        <p className="-mt-2 text-sm text-(--text-tertiary)">
          A job is a run that can hold many delivery stops (drops). Name it here — after you create it, you'll add its
          stops (one by one or by importing a manifest CSV).
        </p>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit({
                ...values,
                description: values.description || undefined,
                // A local datetime-local value → ISO for the API. Empty means
                // "today" (unscheduled), which the board's Today view shows.
                scheduledAt: values.scheduledAt ? new Date(values.scheduledAt).toISOString() : undefined,
                pickupDepotId: pickupDepotId === NO_DEPOT_VALUE ? undefined : pickupDepotId,
              });
              onOpenChange(false);
            })}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Run title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Monday city run — northern suburbs" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Notes for whoever picks this up" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="scheduledAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled for (optional)</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <p className="text-xs text-(--text-tertiary)">
                    Set a future date to plan a run ahead — it appears under the Upcoming tab. Leave blank for today.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-1.5">
              <Label>Pickup depot (optional)</Label>
              <Select value={pickupDepotId} onValueChange={setPickupDepotId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DEPOT_VALUE}>— No pickup depot —</SelectItem>
                  {depots.map((depot) => (
                    <SelectItem key={depot.id} value={depot.id}>
                      {depot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <PickerError query={depotsQuery} noun="depots" />
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating…' : 'Create & add stops'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
