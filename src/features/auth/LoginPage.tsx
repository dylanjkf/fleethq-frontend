import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { ApiClientError } from '@/api/client';
import type { CompanyChoice, LoginResult } from '@/api/types';

const loginSchema = z.object({
  username: z.string().min(1, 'Required'),
  password: z.string().min(1, 'Required'),
});

const mfaSchema = z.object({
  code: z.string().min(6, 'Enter your 6-digit code or a backup code'),
});

export function LoginPage() {
  const { login, selectCompany, verifyMfa } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [companyChoice, setCompanyChoice] = useState<{
    preAuthToken: string;
    companies: CompanyChoice[];
  } | null>(null);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });
  const mfaForm = useForm<z.infer<typeof mfaSchema>>({
    resolver: zodResolver(mfaSchema),
    defaultValues: { code: '' },
  });

  /** Route a login/verify result to the next step (session, MFA, or chooser). */
  function handleResult(result: LoginResult) {
    if (result.status === 'authenticated') {
      navigate('/', { replace: true });
    } else if (result.status === 'mfa_required') {
      setMfaToken(result.mfaToken);
    } else {
      setCompanyChoice({ preAuthToken: result.preAuthToken, companies: result.companies });
    }
  }

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setFormError(null);
    try {
      handleResult(await login(values.username, values.password));
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : 'Something went wrong. Try again.');
    }
  }

  async function onSubmitMfa(values: z.infer<typeof mfaSchema>) {
    if (!mfaToken) return;
    setFormError(null);
    try {
      handleResult(await verifyMfa(mfaToken, values.code.trim()));
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : 'That code is incorrect.');
    }
  }

  async function onChooseCompany(companyId: string) {
    if (!companyChoice) return;
    setSelecting(true);
    setFormError(null);
    try {
      await selectCompany(companyChoice.preAuthToken, companyId);
      navigate('/', { replace: true });
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : 'Something went wrong. Try again.');
      setSelecting(false);
    }
  }

  const title = mfaToken ? 'Two-factor verification' : companyChoice ? 'Choose a company' : 'Sign in to FleetOS';
  const description = mfaToken
    ? 'Enter the 6-digit code from your authenticator app (or a backup code).'
    : companyChoice
      ? 'Your account has access to more than one company.'
      : 'Enter your company-issued username and password.';

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--surface-1) p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex-col items-start gap-1">
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {mfaToken ? (
            <Form {...mfaForm}>
              <form onSubmit={mfaForm.handleSubmit(onSubmitMfa)} className="space-y-4">
                <FormField
                  control={mfaForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Authentication code</FormLabel>
                      <FormControl>
                        <Input inputMode="numeric" autoComplete="one-time-code" autoFocus placeholder="123456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {formError && <p className="text-sm text-danger-500">{formError}</p>}
                <Button type="submit" className="w-full" disabled={mfaForm.formState.isSubmitting}>
                  {mfaForm.formState.isSubmitting ? 'Verifying…' : 'Verify'}
                </Button>
              </form>
            </Form>
          ) : companyChoice ? (
            <div className="space-y-2">
              {companyChoice.companies.map((company) => (
                <Button
                  key={company.id}
                  variant="secondary"
                  className="w-full justify-start"
                  disabled={selecting}
                  onClick={() => onChooseCompany(company.id)}
                >
                  {company.name}
                </Button>
              ))}
              {formError && <p className="text-sm text-danger-500">{formError}</p>}
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input autoComplete="username" autoFocus {...field} />
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="current-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {formError && <p className="text-sm text-danger-500">{formError}</p>}
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
                </Button>
                <Link to="/forgot-password" className="block text-center text-sm text-(--text-tertiary) hover:text-accent-600">
                  Forgot your password?
                </Link>
                <p className="text-center text-sm text-(--text-tertiary)">
                  New to FleetOS?{' '}
                  <Link to="/signup" className="text-accent-600 hover:underline">
                    Create your company
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
