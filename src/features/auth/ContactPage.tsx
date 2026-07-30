import { useState } from 'react';
import { Link } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ApiClientError } from '@/api/client';
import { submitContact } from '@/api/contact';

const contactSchema = z.object({
  name: z.string().min(1, 'Required').max(200),
  email: z.string().email('Enter a valid email').max(200),
  message: z.string().min(1, 'Required').max(4000),
});

type ContactShape = z.infer<typeof contactSchema>;

/** FleetHQ has no self-service signup/free trial — this is a prospective customer's way in. */
export function ContactPage() {
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const form = useForm<ContactShape>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', message: '' },
  });

  async function onSubmit(values: ContactShape) {
    setFormError(null);
    try {
      await submitContact(values);
      setSent(true);
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : 'Something went wrong. Try again.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--surface-1) p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex-col items-start gap-1">
          <CardTitle className="text-lg">Get in touch</CardTitle>
          <CardDescription>
            Tell us about your fleet and we'll be in touch to set you up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-(--text-secondary)">
                Thanks — we've received your message and will be in touch shortly.
              </p>
              <Link to="/login" className="block text-center text-sm text-accent-600 hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your name</FormLabel>
                      <FormControl>
                        <Input autoComplete="name" autoFocus {...field} />
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea rows={5} placeholder="Tell us a bit about your fleet…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {formError && <p className="text-sm text-danger-500">{formError}</p>}
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Sending…' : 'Send'}
                </Button>
                <p className="text-center text-sm text-(--text-tertiary)">
                  Already have an account?{' '}
                  <Link to="/login" className="text-accent-600 hover:underline">
                    Sign in
                  </Link>
                </p>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
