import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { ApiClientError } from '@/api/client';
import { createSignup, getSignupConfig, type SignupConfig } from '@/api/signup';

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 100_000;

const signupSchema = z.object({
  companyName: z.string().trim().min(1, 'Required').max(200),
  adminName: z.string().trim().min(1, 'Required').max(200),
  adminEmail: z.string().trim().email('Enter a valid email').max(200),
  adminPassword: z.string().min(8, 'At least 8 characters'),
  // Kept as a string in form state (not z.coerce.number()) — an <input
  // type="number"> field value is a string regardless, and z.coerce's
  // "any input, number output" shape breaks react-hook-form's resolver
  // generics. Parsed to a number in onSubmit; the charge is server-computed.
  quantity: z
    .string()
    .refine((v) => /^\d+$/.test(v) && Number(v) >= MIN_QUANTITY && Number(v) <= MAX_QUANTITY, `Enter a number from ${MIN_QUANTITY} to ${MAX_QUANTITY}`),
  acceptedTerms: z.boolean().refine((v) => v === true, { message: 'Please accept the terms to continue' }),
  // Honeypot — hidden from real users; a filled value blocks submission (bot).
  website: z.string().max(0).optional(),
});

type SignupForm = z.infer<typeof signupSchema>;

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : err instanceof Error && err.message ? err.message : fallback;
}

function money(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

export function SignupPage() {
  const { status } = useAuth();
  const [config, setConfig] = useState<SignupConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { companyName: '', adminName: '', adminEmail: '', adminPassword: '', quantity: '5', acceptedTerms: false, website: '' },
  });

  useEffect(() => {
    getSignupConfig()
      .then(setConfig)
      .catch(() => setConfig(null))
      .finally(() => setConfigLoading(false));
  }, []);

  const quantity = form.watch('quantity');
  const preview = useMemo(() => {
    if (!config) return null;
    const parsed = /^\d+$/.test(quantity) ? Number(quantity) : 0;
    const qty = parsed >= MIN_QUANTITY ? Math.min(MAX_QUANTITY, parsed) : 0;
    const subtotal = qty * config.pricePerAssetCents;
    const gst = Math.round(subtotal * config.gstRate);
    return { qty, subtotal, gst, total: subtotal + gst };
  }, [config, quantity]);

  // An already-signed-in user has no business on the signup page.
  if (status === 'authenticated') return <Navigate to="/" replace />;

  async function onSubmit(values: SignupForm) {
    setFormError(null);
    try {
      const { url } = await createSignup({
        companyName: values.companyName.trim(),
        adminName: values.adminName.trim(),
        adminEmail: values.adminEmail.trim(),
        adminPassword: values.adminPassword,
        quantity: Number(values.quantity),
        acceptedTerms: true,
        website: values.website,
      });
      // Hand off to Stripe's hosted Checkout — the account is provisioned only
      // after payment succeeds (via webhook), then /signup/complete logs them in.
      window.location.href = url;
    } catch (err) {
      setFormError(errorMessage(err, 'Could not start your signup. Please try again.'));
    }
  }

  function adjustQuantity(delta: number) {
    const current = /^\d+$/.test(quantity) ? Number(quantity) : MIN_QUANTITY;
    const next = Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, current + delta));
    form.setValue('quantity', String(next), { shouldValidate: true, shouldDirty: true });
  }

  const interval = config?.billingInterval ?? 'month';
  const perAsset = config ? money(config.pricePerAssetCents, config.currency) : '$19.00';

  return (
    <div className="flex min-h-screen">
      <aside
        className="industrial-grid relative hidden w-1/2 flex-col justify-between overflow-hidden p-10 text-white lg:flex xl:w-[55%]"
        style={{ background: 'linear-gradient(135deg, oklch(0.27 0.11 262) 0%, oklch(0.2 0.04 264) 55%, oklch(0.15 0.02 264) 100%)' }}
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-accent-400 to-accent2-500 text-sm font-bold shadow-lg">F</span>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight">FleetHQ</span>
            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-white/50">Fleet Operations</span>
          </div>
        </div>
        <div className="relative max-w-md">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-accent-200/80">Start in minutes</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight">Put your whole fleet on one platform.</h1>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            {perAsset} per asset, per {interval}. Pay only for what you track — add or remove assets any time. No setup fees.
          </p>
        </div>
        <div className="relative flex items-center gap-6 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-white/40">
          <span>Cancel anytime</span>
          <span className="h-1 w-1 rounded-full bg-white/30" />
          <span>Australian-built</span>
          <span className="h-1 w-1 rounded-full bg-white/30" />
          <span>GST invoiced</span>
        </div>
      </aside>

      <div className="flex flex-1 items-center justify-center bg-(--surface-1) p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-accent-400 to-accent2-500 text-sm font-bold text-white shadow-sm">F</span>
            <span className="text-base font-semibold tracking-tight text-(--text-primary)">FleetHQ</span>
          </div>
          <Card className="w-full">
            <CardHeader className="flex-col items-start gap-1">
              <CardTitle className="text-lg">Create your FleetHQ account</CardTitle>
              <CardDescription>Choose how many assets to track, pay securely, and start straight away.</CardDescription>
            </CardHeader>
            <CardContent>
              {configLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                </div>
              ) : !config?.enabled ? (
                <div className="space-y-4">
                  <p className="text-sm text-(--text-secondary)">
                    Self-serve signup isn’t available right now. Get in touch and we’ll set your account up for you.
                  </p>
                  <Link to="/contact"><Button className="w-full">Contact us</Button></Link>
                  <p className="text-center text-sm text-(--text-tertiary)">
                    Already have an account? <Link to="/login" className="text-accent-600 hover:underline">Sign in</Link>
                  </p>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={form.control} name="companyName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company name</FormLabel>
                        <FormControl><Input autoFocus autoComplete="organization" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="adminName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your name</FormLabel>
                        <FormControl><Input autoComplete="name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="adminEmail" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work email</FormLabel>
                        <FormControl><Input type="email" autoComplete="email" {...field} /></FormControl>
                        <FormMessage />
                        <p className="text-xs text-(--text-tertiary)">You’ll sign in with this email.</p>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="adminPassword" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="quantity" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assets to track</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="secondary" aria-label="Decrease" className="h-9 w-9 shrink-0 p-0" onClick={() => adjustQuantity(-1)}>−</Button>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={MIN_QUANTITY}
                              max={MAX_QUANTITY}
                              className="text-center"
                              {...field}
                            />
                            <Button type="button" variant="secondary" aria-label="Increase" className="h-9 w-9 shrink-0 p-0" onClick={() => adjustQuantity(1)}>+</Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Live price preview — convenience only; the charge is recomputed server-side. */}
                    {preview && (
                      <div className="rounded-md border border-(--border) bg-(--surface-2) p-3 text-sm">
                        <div className="flex justify-between text-(--text-secondary)">
                          <span>{preview.qty} {preview.qty === 1 ? 'asset' : 'assets'} × {perAsset}</span>
                          <span>{money(preview.subtotal, config.currency)}</span>
                        </div>
                        <div className="flex justify-between text-(--text-secondary)">
                          <span>GST ({Math.round(config.gstRate * 100)}%)</span>
                          <span>{money(preview.gst, config.currency)}</span>
                        </div>
                        <div className="mt-1 flex justify-between border-t border-(--border) pt-1 font-semibold text-(--text-primary)">
                          <span>Total per {interval}</span>
                          <span>{money(preview.total, config.currency)}</span>
                        </div>
                      </div>
                    )}

                    <FormField control={form.control} name="acceptedTerms" render={({ field }) => (
                      <FormItem>
                        <label className="flex items-start gap-2 text-sm text-(--text-tertiary)">
                          <input type="checkbox" className="mt-0.5" checked={field.value === true} onChange={(e) => field.onChange(e.target.checked)} />
                          <span>
                            I agree to the{' '}
                            <Link to="/terms" className="text-accent-600 hover:underline">Terms of Service</Link>{' '}and{' '}
                            <Link to="/privacy" className="text-accent-600 hover:underline">Privacy Policy</Link>. Billed monthly, cancel anytime.
                          </span>
                        </label>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Honeypot: visually hidden, off the tab order, ignored by real users. */}
                    <input
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                      className="hidden"
                      {...form.register('website')}
                    />

                    {formError && <p className="text-sm text-danger-500">{formError}</p>}
                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? 'Redirecting to secure checkout…' : 'Continue to payment'}
                    </Button>
                    <p className="text-center text-xs text-(--text-tertiary)">
                      You’ll enter card details on Stripe’s secure page. We never see your card.
                    </p>
                    <p className="text-center text-sm text-(--text-tertiary)">
                      Already have an account? <Link to="/login" className="text-accent-600 hover:underline">Sign in</Link>
                    </p>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
