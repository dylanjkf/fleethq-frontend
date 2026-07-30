import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Operator, RoleView } from '@/api/types';

const schema = z.object({
  username: z.string().min(1, 'Required').max(100),
  password: z.string().min(8, 'At least 8 characters'),
  roleId: z.string().min(1, 'Required'),
});
export type LinkOperatorUserFormValues = z.infer<typeof schema>;

interface LinkOperatorUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operator?: Operator;
  roles: RoleView[];
  onSubmit: (values: LinkOperatorUserFormValues) => Promise<void>;
  isSubmitting: boolean;
}

/** Creates a new User + CompanyMembership + Role and links it as this Operator's DriverOS login. */
export function LinkOperatorUserDialog({
  open,
  onOpenChange,
  operator,
  roles,
  onSubmit,
  isSubmitting,
}: LinkOperatorUserDialogProps) {
  const form = useForm<LinkOperatorUserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '', roleId: '' },
  });

  useEffect(() => {
    if (open) form.reset({ username: '', password: '', roleId: '' });
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Grant a DriverOS login</DialogTitle>
          <DialogDescription>
            {operator ? `For "${operator.fullName}". ` : ''}Creates a new login and grants it a role — the
            operator uses these credentials to sign into DriverOS.
          </DialogDescription>
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
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. dana.driver" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temporary password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Granting…' : 'Grant login'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
