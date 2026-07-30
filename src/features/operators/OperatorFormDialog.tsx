import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { Operator } from '@/api/types';

const schema = z.object({
  fullName: z.string().min(1, 'Required').max(200),
  email: z.union([z.string().email('Invalid email'), z.literal('')]).optional(),
  phone: z.string().max(50).optional(),
});
export type OperatorFormValues = z.infer<typeof schema>;

interface OperatorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operator?: Operator;
  onSubmit: (values: OperatorFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export function OperatorFormDialog({
  open,
  onOpenChange,
  operator,
  onSubmit,
  isSubmitting,
}: OperatorFormDialogProps) {
  const form = useForm<OperatorFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', phone: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        fullName: operator?.fullName ?? '',
        email: operator?.email ?? '',
        phone: operator?.phone ?? '',
      });
    }
  }, [open, operator, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{operator ? 'Edit operator' : 'New operator'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (values) => {
              // Blank optional fields must be omitted, not sent as '' — the
              // backend's @IsEmail() rejects an empty string (it only skips
              // validation when the field is absent).
              await onSubmit({
                ...values,
                email: values.email || undefined,
                phone: values.phone || undefined,
              });
              onOpenChange(false);
            })}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (optional)</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                {isSubmitting ? 'Saving…' : operator ? 'Save changes' : 'Create operator'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
