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
import { beginPolicyMfaSetup, getAuthProviders, requestMagicLink } from '@/api/auth';
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

const policyMfaSchema = z.object({
  code: z.string().min(6, 'Enter the 6-digit code from your authenticator app'),
});

const newPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'At least 8 characters, combining two of: lowercase, uppercase, numbers, symbols'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : err instanceof Error && err.message ? err.message : fallback;
}

export function LoginPage() {
  const { login, selectCompany, verifyMfa, loginWithOAuth, loginWithPasskey, confirmPolicyMfaSetup, changeExpiredPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const [companyChoice, setCompanyChoice] = useState<{
    preAuthToken: string;
    companies: CompanyChoice[];
  } | null>(null);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  // Auth/Billing Platform Phase 3: a login blocked by this company's mandatory-MFA
  // or password-expiry policy hands back a short-lived token instead of a session.
  const [mfaSetup, setMfaSetup] = useState<{ setupToken: string; secret: string; otpauthUrl: string } | null>(null);
  const [mfaSetupBackupCodes, setMfaSetupBackupCodes] = useState<string[] | null>(null);
  const [pendingAfterBackupCodes, setPendingAfterBackupCodes] = useState<LoginResult | null>(null);
  const [passwordExpiredToken, setPasswordExpiredToken] = useState<string | null>(null);
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
  const policyMfaForm = useForm<z.infer<typeof policyMfaSchema>>({
    resolver: zodResolver(policyMfaSchema),
    defaultValues: { code: '' },
  });
  const newPasswordForm = useForm<z.infer<typeof newPasswordSchema>>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  /**
   * Route a login/verify result to the next step. `mfa_setup_required` and
   * `password_expired` (Auth/Billing Platform Phase 3) can also chain into
   * each other once resolved — e.g. finishing forced MFA enrolment can still
   * come back `password_expired` if the same company also enforces password
   * expiry — so every completion path funnels back through here rather than
   * assuming `authenticated` is the only next state.
   */
  async function handleResult(result: LoginResult) {
    if (result.status === 'authenticated') {
      navigate('/', { replace: true });
    } else if (result.status === 'mfa_required') {
      setMfaToken(result.mfaToken);
    } else if (result.status === 'mfa_setup_required') {
      try {
        const { secret, otpauthUrl } = await beginPolicyMfaSetup(result.setupToken);
        setMfaSetup({ setupToken: result.setupToken, secret, otpauthUrl });
      } catch (err) {
        setFormError(errorMessage(err, 'Could not start two-factor setup.'));
      }
    } else if (result.status === 'password_expired') {
      setPasswordExpiredToken(result.changeToken);
    } else {
      setCompanyChoice({ preAuthToken: result.preAuthToken, companies: result.companies });
    }
  }

  // A magic-link click that resolved to mfa_required/choose_company hands off
  // here (MagicLinkPage navigates back with the result rather than duplicating
  // this page's MFA/company-chooser UI).
  useEffect(() => {
    const pending = (location.state as { pendingResult?: LoginResult } | null)?.pendingResult;
    if (pending) void handleResult(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setFormError(null);
    try {
      await handleResult(await login(values.username, values.password, rememberMe));
    } catch (err) {
      setFormError(errorMessage(err, 'Something went wrong. Try again.'));
    }
  }

  async function onSubmitMfa(values: z.infer<typeof mfaSchema>) {
    if (!mfaToken) return;
    setFormError(null);
    try {
      await handleResult(await verifyMfa(mfaToken, values.code.trim(), rememberDevice));
    } catch (err) {
      setFormError(errorMessage(err, 'That code is incorrect.'));
    }
  }

  async function onChooseCompany(companyId: string) {
    if (!companyChoice) return;
    setSelecting(true);
    setFormError(null);
    try {
      const result = await selectCompany(companyChoice.preAuthToken, companyId);
      setCompanyChoice(null);
      await handleResult(result);
    } catch (err) {
      setFormError(errorMessage(err, 'Something went wrong. Try again.'));
    } finally {
      setSelecting(false);
    }
  }

  async function onSubmitPolicyMfaSetup(values: z.infer<typeof policyMfaSchema>) {
    if (!mfaSetup) return;
    setFormError(null);
    try {
      const { backupCodes, ...result } = await confirmPolicyMfaSetup(mfaSetup.setupToken, values.code.trim());
      setMfaSetup(null);
      setMfaSetupBackupCodes(backupCodes);
      setPendingAfterBackupCodes(result);
    } catch (err) {
      setFormError(errorMessage(err, 'That code is incorrect.'));
    }
  }

  async function onContinueAfterBackupCodes() {
    setMfaSetupBackupCodes(null);
    const pending = pendingAfterBackupCodes;
    setPendingAfterBackupCodes(null);
    if (pending) await handleResult(pending);
  }

  async function onSubmitPasswordExpired(values: z.infer<typeof newPasswordSchema>) {
    if (!passwordExpiredToken) return;
    setFormError(null);
    try {
      const result = await changeExpiredPassword(passwordExpiredToken, values.newPassword);
      setPasswordExpiredToken(null);
      await handleResult(result);
    } catch (err) {
      setFormError(errorMessage(err, 'Could not update your password.'));
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
      await handleResult(await loginWithPasskey());
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
      await handleResult(await loginWithOAuth(provider, idToken, rememberMe));
    } catch (err) {
      setFormError(errorMessage(err, `Could not sign in with ${provider === 'google' ? 'Google' : 'Microsoft'}.`));
    }
  }

  const title = mfaSetupBackupCodes
    ? 'Save your backup codes'
    : mfaSetup
      ? 'Set up two-factor authentication'
      : passwordExpiredToken
        ? 'Choose a new password'
        : mfaToken
          ? 'Two-factor verification'
          : companyChoice
            ? 'Choose a company'
            : mode === 'magic-link' || mode === 'magic-link-sent'
              ? 'Email me a sign-in link'
              : 'Sign in to FleetOS';
  const description = mfaSetupBackupCodes
    ? "Each can be used once if you lose your authenticator. They won't be shown again."
    : mfaSetup
      ? 'Your company requires two-factor authentication to sign in.'
      : passwordExpiredToken
        ? 'Your company requires a password change before you can continue.'
        : mfaToken
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
          {mfaSetupBackupCodes ? (
            <div key="backup-codes" className="space-y-2">
              <ul className="grid grid-cols-2 gap-1 rounded bg-(--surface-2) p-2 font-mono text-(--text-primary)">
                {mfaSetupBackupCodes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <Button className="w-full" onClick={onContinueAfterBackupCodes}>
                Continue
              </Button>
            </div>
          ) : mfaSetup ? (
            <Form key="mfa-setup" {...policyMfaForm}>
              <form onSubmit={policyMfaForm.handleSubmit(onSubmitPolicyMfaSetup)} className="space-y-4">
                <p className="text-sm text-(--text-secondary)">
                  In your authenticator app (Google Authenticator, Authy, 1Password…), add an account and enter this key:
                </p>
                <code className="block break-all rounded bg-(--surface-2) px-2 py-1 font-mono text-(--text-primary)">{mfaSetup.secret}</code>
                <FormField
                  control={policyMfaForm.control}
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
                <Button type="submit" className="w-full" disabled={policyMfaForm.formState.isSubmitting}>
                  {policyMfaForm.formState.isSubmitting ? 'Verifying…' : 'Confirm & continue'}
                </Button>
              </form>
            </Form>
          ) : passwordExpiredToken ? (
            <Form key="password-expired" {...newPasswordForm}>
              <form onSubmit={newPasswordForm.handleSubmit(onSubmitPasswordExpired)} className="space-y-4">
                <FormField
                  control={newPasswordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" autoFocus {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newPasswordForm.control}
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
                {formError && <p className="text-sm text-danger-500">{formError}</p>}
                <Button type="submit" className="w-full" disabled={newPasswordForm.formState.isSubmitting}>
                  {newPasswordForm.formState.isSubmitting ? 'Saving…' : 'Update password & continue'}
                </Button>
              </form>
            </Form>
          ) : mfaToken ? (
            <Form key="mfa-challenge" {...mfaForm}>
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
            <div key="company-choice" className="space-y-2">
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
            <div key="magic-link-sent" className="space-y-4">
              <p className="text-sm text-(--text-secondary)">
                If an account matches, a sign-in link is on its way. Check your email and follow the link — it works for 15 minutes.
              </p>
              <Button variant="secondary" className="w-full" onClick={() => setMode('password')}>
                ← Back to sign in
              </Button>
            </div>
          ) : mode === 'magic-link' ? (
            <Form key="magic-link" {...magicLinkForm}>
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
            <div key="password-login" className="space-y-4">
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
