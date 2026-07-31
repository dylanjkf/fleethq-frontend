import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { ApiClientError } from '@/api/client';
import { getAuthProviders, requestMagicLink } from '@/api/auth';
import type { AuthProviders, CompanyChoice, LoginResult } from '@/api/types';
import { googleAuthorizeUrl, microsoftAuthorizeUrl, signInWithOidcPopup } from '@/lib/oauth-popup';

const loginSchema = z.object({
  username: z.string().min(1, 'Required'),
  password: z.string().min(1, 'Required'),
});

const mfaSchema = z.object({
  code: z.string().min(6, 'Enter your 6-digit code or a backup code'),
});

const magicLinkSchema = z.object({
  identifier: z.string().min(1, 'Required'),
});

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : err instanceof Error && err.message ? err.message : fallback;
}

export function LoginPage() {
  const { login, selectCompany, verifyMfa, loginWithOAuth, loginWithPasskey } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const [companyChoice, setCompanyChoice] = useState<{
    preAuthToken: string;
    companies: CompanyChoice[];
  } | null>(null);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [mode, setMode] = useState<'password' | 'magic-link' | 'magic-link-sent'>('password');
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [providers, setProviders] = useState<AuthProviders | null>(null);

  useEffect(() => {
    getAuthProviders()
      .then(setProviders)
      .catch(() => setProviders({ magicLink: true, webauthn: true, google: false, microsoft: false }));
  }, []);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });
  const mfaForm = useForm<z.infer<typeof mfaSchema>>({
    resolver: zodResolver(mfaSchema),
    defaultValues: { code: '' },
  });
  const magicLinkForm = useForm<z.infer<typeof magicLinkSchema>>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { identifier: '' },
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

  // A magic-link click that resolved to mfa_required/choose_company hands off
  // here (MagicLinkPage navigates back with the result rather than duplicating
  // this page's MFA/company-chooser UI).
  useEffect(() => {
    const pending = (location.state as { pendingResult?: LoginResult } | null)?.pendingResult;
    if (pending) handleResult(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setFormError(null);
    try {
      handleResult(await login(values.username, values.password, rememberMe));
    } catch (err) {
      setFormError(errorMessage(err, 'Something went wrong. Try again.'));
    }
  }

  async function onSubmitMfa(values: z.infer<typeof mfaSchema>) {
    if (!mfaToken) return;
    setFormError(null);
    try {
      handleResult(await verifyMfa(mfaToken, values.code.trim(), rememberDevice));
    } catch (err) {
      setFormError(errorMessage(err, 'That code is incorrect.'));
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
      setFormError(errorMessage(err, 'Something went wrong. Try again.'));
      setSelecting(false);
    }
  }

  async function onSubmitMagicLink(values: z.infer<typeof magicLinkSchema>) {
    setFormError(null);
    try {
      await requestMagicLink(values.identifier.trim());
    } finally {
      setMode('magic-link-sent');
    }
  }

  async function onPasskeyLogin() {
    setFormError(null);
    setPasskeyBusy(true);
    try {
      handleResult(await loginWithPasskey());
    } catch (err) {
      setFormError(errorMessage(err, 'Could not sign in with that passkey.'));
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function onSocialLogin(provider: 'google' | 'microsoft') {
    setFormError(null);
    try {
      const idToken = await signInWithOidcPopup({
        authorizeUrl: provider === 'google' ? googleAuthorizeUrl() : microsoftAuthorizeUrl(import.meta.env.VITE_MICROSOFT_OAUTH_TENANT_ID),
        clientId: provider === 'google' ? import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID : import.meta.env.VITE_MICROSOFT_OAUTH_CLIENT_ID,
        redirectUri: `${window.location.origin}/oauth-callback`,
      });
      handleResult(await loginWithOAuth(provider, idToken, rememberMe));
    } catch (err) {
      setFormError(errorMessage(err, `Could not sign in with ${provider === 'google' ? 'Google' : 'Microsoft'}.`));
    }
  }

  const title = mfaToken
    ? 'Two-factor verification'
    : companyChoice
      ? 'Choose a company'
      : mode === 'magic-link' || mode === 'magic-link-sent'
        ? 'Email me a sign-in link'
        : 'Sign in to FleetOS';
  const description = mfaToken
    ? 'Enter the 6-digit code from your authenticator app (or a backup code).'
    : companyChoice
      ? 'Your account has access to more than one company.'
      : mode === 'magic-link' || mode === 'magic-link-sent'
        ? "We'll email you a link that signs you in — no password needed."
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
                <label className="flex items-center gap-2 text-sm text-(--text-tertiary)">
                  <input type="checkbox" checked={rememberDevice} onChange={(e) => setRememberDevice(e.target.checked)} />
                  Remember this device for 30 days
                </label>
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
          ) : mode === 'magic-link-sent' ? (
            <div className="space-y-4">
              <p className="text-sm text-(--text-secondary)">
                If an account matches, a sign-in link is on its way. Check your email and follow the link — it works for 15 minutes.
              </p>
              <Button variant="secondary" className="w-full" onClick={() => setMode('password')}>
                ← Back to sign in
              </Button>
            </div>
          ) : mode === 'magic-link' ? (
            <Form {...magicLinkForm}>
              <form onSubmit={magicLinkForm.handleSubmit(onSubmitMagicLink)} className="space-y-4">
                <FormField
                  control={magicLinkForm.control}
                  name="identifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username or email</FormLabel>
                      <FormControl>
                        <Input autoFocus {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {formError && <p className="text-sm text-danger-500">{formError}</p>}
                <Button type="submit" className="w-full" disabled={magicLinkForm.formState.isSubmitting}>
                  {magicLinkForm.formState.isSubmitting ? 'Sending…' : 'Send sign-in link'}
                </Button>
                <button type="button" onClick={() => setMode('password')} className="block w-full text-center text-sm text-(--text-tertiary) hover:text-accent-600">
                  ← Back to sign in with a password
                </button>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
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
                  <label className="flex items-center gap-2 text-sm text-(--text-tertiary)">
                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                    Remember me for 30 days
                  </label>
                  {formError && <p className="text-sm text-danger-500">{formError}</p>}
                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
                  </Button>
                  <Link to="/forgot-password" className="block text-center text-sm text-(--text-tertiary) hover:text-accent-600">
                    Forgot your password?
                  </Link>
                </form>
              </Form>

              <div className="space-y-2">
                <Button type="button" variant="secondary" className="w-full" onClick={() => setMode('magic-link')}>
                  Email me a sign-in link
                </Button>
                <Button type="button" variant="secondary" className="w-full" disabled={passkeyBusy} onClick={onPasskeyLogin}>
                  {passkeyBusy ? 'Waiting for your passkey…' : 'Continue with a passkey'}
                </Button>
                {providers?.google && (
                  <Button type="button" variant="secondary" className="w-full" onClick={() => onSocialLogin('google')}>
                    Continue with Google
                  </Button>
                )}
                {providers?.microsoft && (
                  <Button type="button" variant="secondary" className="w-full" onClick={() => onSocialLogin('microsoft')}>
                    Continue with Microsoft
                  </Button>
                )}
              </div>

              <Separator />
              <p className="text-center text-sm text-(--text-tertiary)">
                New to FleetHQ?{' '}
                <Link to="/contact" className="text-accent-600 hover:underline">
                  Get in touch
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
