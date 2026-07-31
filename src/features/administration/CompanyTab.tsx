import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getMyCompany, updateMyCompany } from '@/api/companies';
import { ApiClientError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/lib/permissions';

const schema = z.object({
  name: z.string().min(1, 'Required').max(200),
  supportPhone: z.string().max(50).optional().or(z.literal('')),
  supportNotes: z.string().max(500).optional().or(z.literal('')),
  abn: z.string().max(20).optional().or(z.literal('')),
  industry: z.string().max(200).optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  // Kept as a string in form state (not z.coerce.number()) — an <input
  // type="number"> Controller field's value is a string regardless, and
  // z.coerce's "any input, number output" shape doesn't play well with
  // react-hook-form's resolver generics. Parsed to a number in onSubmit.
  fleetSizeEstimate: z
    .string()
    .max(6)
    .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 100000), 'Enter a number from 1 to 100000'),
});

export function CompanyTab() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: company, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['company', 'me'],
    queryFn: getMyCompany,
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', supportPhone: '', supportNotes: '', abn: '', industry: '', phone: '', fleetSizeEstimate: '' },
  });

  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name,
        supportPhone: company.supportPhone ?? '',
        supportNotes: company.supportNotes ?? '',
        abn: company.abn ?? '',
        industry: company.industry ?? '',
        phone: company.phone ?? '',
        fleetSizeEstimate: company.fleetSizeEstimate != null ? String(company.fleetSizeEstimate) : '',
      });
    }
  }, [company, form]);

  const updateMutation = useMutation({
    mutationFn: updateMyCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', 'me'] });
      toast({ title: 'Company profile updated', variant: 'success' });
    },
    onError: (err) =>
      toast({
        title: 'Could not update company profile',
        description: err instanceof ApiClientError ? err.message : 'An unexpected error occurred.',
        variant: 'destructive',
      }),
  });

  if (isLoading) return <Skeleton className="h-40 w-full max-w-lg" />;
  if (isError) return <ErrorState message={error instanceof ApiClientError ? error.message : 'Failed to load.'} onRetry={() => refetch()} />;

  const canEdit = can(PERMISSIONS.COMPANIES_EDIT);

  // abn/fleetSizeEstimate must be omitted rather than sent blank — unlike the
  // plain-string fields above, the backend's `@IsOptional()` only skips
  // validation for `undefined`, and an empty string fails `@IsAbn()` while an
  // empty fleetSizeEstimate fails `@IsInt()`. This means a value, once set,
  // can't be blanked back out from this form — an accepted limitation, not a
  // supported "clear" action for either field.
  function onSubmit(values: z.infer<typeof schema>) {
    updateMutation.mutate({
      ...values,
      abn: values.abn || undefined,
      fleetSizeEstimate: values.fleetSizeEstimate === '' ? undefined : Number(values.fleetSizeEstimate),
    });
  }

  return (
    <Card className="max-w-lg">
      <CardHeader className="flex-col items-start gap-1">
        <CardTitle>Company profile</CardTitle>
        <CardDescription>Jurisdiction is fixed to AU for now — see the FleetOS Constitution.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company name</FormLabel>
                  <FormControl>
                    <Input disabled={!canEdit} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="abn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ABN</FormLabel>
                  <FormControl>
                    <Input disabled={!canEdit} placeholder="51 824 753 556" {...field} />
                  </FormControl>
                  <p className="text-xs text-(--text-tertiary)">Australian Business Number.</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <FormControl>
                    <Input disabled={!canEdit} placeholder="Courier & parcel delivery" {...field} />
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
                  <FormLabel>Business phone</FormLabel>
                  <FormControl>
                    <Input disabled={!canEdit} placeholder="1300 555 000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fleetSizeEstimate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fleet size</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={100000} disabled={!canEdit} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="supportPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Support phone</FormLabel>
                  <FormControl>
                    <Input disabled={!canEdit} placeholder="1300 555 000" {...field} />
                  </FormControl>
                  <p className="text-xs text-(--text-tertiary)">
                    Shown to every operator as a fallback for when messaging the office isn't fast enough.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="supportNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Support notes</FormLabel>
                  <FormControl>
                    <Textarea rows={3} disabled={!canEdit} placeholder="Office hours, after-hours contact, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {canEdit && (
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
