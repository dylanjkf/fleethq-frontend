import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { Part } from '@/api/types';

const schema = z.object({
  name: z.string().min(1, 'Required').max(200),
  partNumber: z.string().max(100).optional(),
  quantityOnHand: z.string().regex(/^\d+$/, 'Must be a whole number'),
  unitCost: z.string().regex(/^\d*\.?\d*$/, 'Must be a number').optional(),
  lowStockThreshold: z.string().regex(/^\d*$/, 'Must be a whole number').optional(),
});
export type PartFormValues = z.infer<typeof schema>;

interface PartFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part?: Part;
  onSubmit: (values: PartFormValues) => Promise<void>;
  isSubmitting: boolean;
}

/** Create/edit a Part in the catalog, including a direct stock correction (restock/stocktake) for an existing part. */
export function PartFormDialog({ open, onOpenChange, part, onSubmit, isSubmitting }: PartFormDialogProps) {
  const form = useForm<PartFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', partNumber: '', quantityOnHand: '0', unitCost: '', lowStockThreshold: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: part?.name ?? '',
        partNumber: part?.partNumber ?? '',
        quantityOnHand: String(part?.quantityOnHand ?? 0),
        unitCost: part?.unitCost != null ? String(part.unitCost) : '',
        lowStockThreshold: part?.lowStockThreshold != null ? String(part.lowStockThreshold) : '',
      });
    }
  }, [open, part, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{part ? 'Edit part' : 'New part'}</DialogTitle>
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
                    <Input placeholder="e.g. Brake pads" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="partNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Part number (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. BP-100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="quantityOnHand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity on hand</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lowStockThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Low-stock threshold (optional)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="1" placeholder="e.g. 3" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="unitCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit cost (optional)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
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
                {isSubmitting ? 'Saving…' : part ? 'Save changes' : 'Create part'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
