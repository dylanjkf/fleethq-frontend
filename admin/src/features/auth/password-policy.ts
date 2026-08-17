import { ApiClientError } from '@/api/client';

/**
 * Client-side password-policy check + friendly error mapping, shared by every
 * admin password-setting surface (ResetPasswordPage, AccountSetupGate's
 * ChangePasswordStep). Extracted so the two can't drift apart (A6.6).
 *
 * ≥8 chars AND all four of: lowercase, uppercase, digit, symbol. Mirrors the
 * server rule in api `is-strong-password.validator.ts`.
 */
export function passwordMeetsPolicy(value: string): boolean {
  if (value.length < 8) return false;
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) => re.test(value)).length;
  return classes === 4;
}

/** One-line description of the policy, reused in field hints and error copy. */
export const PASSWORD_POLICY_HINT =
  'Use at least 8 characters, including lowercase, uppercase, a number, and a symbol.';

/**
 * Friendly, code-driven copy for a password set/change failure. `context` only
 * tailors the connection-failure fallback wording; the class/reuse/credential
 * messages are shared.
 */
export function passwordErrorMessage(err: unknown, context: 'reset' | 'change' = 'reset'): string {
  if (err instanceof ApiClientError) {
    switch (err.code) {
      case 'INVALID_TOKEN':
        return 'This reset link is invalid or has expired. Request a new one.';
      case 'WEAK_PASSWORD':
        return `That password is too weak. ${PASSWORD_POLICY_HINT}`;
      case 'PASSWORD_REUSED':
        return "You can't reuse a previous password. Please choose a new one.";
      case 'INVALID_CREDENTIALS':
        return 'Your current password is incorrect.';
    }
  }
  return context === 'change'
    ? 'Could not change your password. Check your connection and try again.'
    : 'Could not reset your password. Check your connection and try again.';
}
