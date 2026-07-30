import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { Depot } from '@/api/types';

const schema = z.object({
  name: z.string().min(1, 'Required').max(200),
  address: z.string().max(300).optional(),
  notes: z.string().max(2000).optional(),
});
export type DepotFormValues = z.infer<typeof schema>;

interface DepotFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  depot?: Depot;
  onSubmit: (values: DepotFormValues) => Promise<void>;
  isSubmitting: boolean;
}

/** Create/edit a Depot — one of the fleet's own pickup/branch locations, distinct from a Customer's address. */
export function DepotFormDialog({ open, onOpenChange, depot, onSubmit, isSubmitting }: DepotFormDialogProps) {
  const form = useForm<DepotFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', address: '', notes: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: depot?.name ?? '', address: depot?.address ?? '', notes: depot?.notes ?? '' });
    }
  }, [open, depot, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{depot ? 'Edit depot' : 'New depot'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values);
              onOpenChange(false);
            })}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Main Warehouse" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="1 Industrial Dr, Suburb" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Access instructions, hours, etc." {...field} />
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
                {isSubmitting ? 'Saving…' : depot ? 'Save changes' : 'Create depot'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
