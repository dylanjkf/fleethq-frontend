import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { listAssets } from '@/api/assets';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PickerError } from '@/components/ui/picker-error';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const schema = z.object({
  assetId: z.string().min(1, 'Required'),
  title: z.string().min(1, 'Required').max(200),
  description: z.string().max(2000).optional(),
});
export type MaintenanceJobFormValues = z.infer<typeof schema>;

interface MaintenanceJobFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: MaintenanceJobFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export function MaintenanceJobFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: MaintenanceJobFormDialogProps) {
  const assetsQuery = useQuery({
    queryKey: ['assets', 'list', 'for-maintenance'],
    queryFn: () => listAssets({ pageSize: 200 }),
    enabled: open,
  });

  const form = useForm<MaintenanceJobFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { assetId: '', title: '', description: '' },
  });

  useEffect(() => {
    if (open) form.reset({ assetId: '', title: '', description: '' });
  }, [open, form]);

  const assets = (assetsQuery.data?.items ?? []).filter((a) => !a.archivedAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a maintenance job</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit({ ...values, description: values.description || undefined });
              onOpenChange(false);
            })}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="assetId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an asset" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <PickerError query={assetsQuery} noun="assets" />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Brake pads worn" autoFocus {...field} />
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
                    <Input placeholder="Details for the technician" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Logging…' : 'Log job'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
