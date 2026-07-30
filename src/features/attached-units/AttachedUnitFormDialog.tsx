import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { AttachedUnit } from '@/api/types';

/**
 * Optional specs mirror the Asset form's: a trailer has a registration, VIN,
 * make and build year too. `year` is a *string* here for the same reason it is in
 * AssetFormDialog — an <input> yields a string, and keeping the schema's input and
 * output types identical avoids the resolver-generic mismatch that coercion
 * introduces. It's converted to a number by the submit handler.
 */
const schema = z.object({
  name: z.string().min(1, 'Required').max(200),
  externalReference: z.string().max(200).optional(),
  registration: z.string().max(64).optional(),
  vin: z.string().max(64).optional(),
  make: z.string().max(120).optional(),
  model: z.string().max(120).optional(),
  year: z.string().optional(),
  notes: z.string().max(2000).optional(),
});
export type AttachedUnitFormValues = z.infer<typeof schema>;

interface AttachedUnitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachedUnit?: AttachedUnit;
  onSubmit: (values: AttachedUnitFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export function AttachedUnitFormDialog({
  open,
  onOpenChange,
  attachedUnit,
  onSubmit,
  isSubmitting,
}: AttachedUnitFormDialogProps) {
  const form = useForm<AttachedUnitFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', externalReference: '', registration: '', vin: '', make: '', model: '', year: '', notes: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: attachedUnit?.name ?? '',
        externalReference: attachedUnit?.externalReference ?? '',
        registration: attachedUnit?.registration ?? '',
        vin: attachedUnit?.vin ?? '',
        make: attachedUnit?.make ?? '',
        model: attachedUnit?.model ?? '',
        year: attachedUnit?.year != null ? String(attachedUnit.year) : '',
        notes: attachedUnit?.notes ?? '',
      });
    }
  }, [open, attachedUnit, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{attachedUnit ? 'Edit attached unit' : 'New attached unit'}</DialogTitle>
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
                    <Input placeholder="e.g. Trailer 4" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="externalReference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>External reference (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Fleet number, chassis number, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="registration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration (optional)</FormLabel>
                    <FormControl><Input placeholder="e.g. XT44QP" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VIN (optional)</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="make"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Make (optional)</FormLabel>
                    <FormControl><Input placeholder="e.g. Krueger" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model (optional)</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year (optional)</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" placeholder="e.g. 2019" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl><Input placeholder="Anything the workshop should know" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : attachedUnit ? 'Save changes' : 'Create attached unit'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
