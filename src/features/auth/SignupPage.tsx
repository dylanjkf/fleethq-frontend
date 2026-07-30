import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { ApiClientError } from '@/api/client';

const signupSchema = z
  .object({
    companyName: z.string().min(1, 'Required').max(200),
    adminFullName: z.string().min(1, 'Required').max(200),
    adminUsername: z.string().min(1, 'Required').max(100),
    adminEmail: z.string().email('Enter a valid email').max(200).optional().or(z.literal('')),
    adminPassword: z.string().min(8, 'At least 8 characters').max(200),
    confirmPassword: z.string().min(1, 'Required'),
  })
  .refine((v) => v.adminPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupShape = z.infer<typeof signupSchema>;

/**
 * Self-service signup — the "10 minutes to first value" on-ramp
 * (00-Company/Mission.md). Creates a company + first admin and logs them
 * straight in on a 14-day free trial. Backed by POST /v1/companies.
 */
export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<SignupShape>({
    resolver: zodResolver(signupSchema),
    defaultValues: { companyName: '', adminFullName: '', adminUsername: '', adminEmail: '', adminPassword: '', confirmPassword: '' },
  });

  async function onSubmit(values: SignupShape) {
    setFormError(null);
    try {
      const result = await signup({
        companyName: values.companyName,
        adminFullName: values.adminFullName,
        adminUsername: values.adminUsername,
        adminEmail: values.adminEmail || undefined,
        adminPassword: values.adminPassword,
      });
      if (result.status === 'authenticated') {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : 'Something went wrong. Try again.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--surface-1) p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex-col items-start gap-1">
          <CardTitle className="text-lg">Start with FleetOS</CardTitle>
          <CardDescription>Create your company and get a 14-day free trial — no card required.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Rapid Dispatch Couriers" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="adminFullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your name</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="adminUsername"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input autoComplete="username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="adminEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (optional)</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="email" {...field} />
                      </FormControl>
                      <FormDescription>For password reset &amp; alerts.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="adminPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {formError && <p className="text-sm text-danger-500">{formError}</p>}
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Creating your company…' : 'Create company & start trial'}
              </Button>
              <p className="text-center text-sm text-(--text-tertiary)">
                Already have an account?{' '}
                <Link to="/login" className="text-accent-600 hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
